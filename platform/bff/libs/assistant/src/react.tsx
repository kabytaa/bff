import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai';
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './styles.css';

export type AssistantUIStyle = CSSProperties & {
  [variable: `--bff-support-${string}`]: string | number | undefined;
};

export interface AssistantPresentation {
  className?: string;
  style?: AssistantUIStyle;
}

function presentationClass(base: string, custom?: string) {
  return custom ? `${base} ${custom}` : base;
}

/** Presentation only: the caller owns identity, page context and view state. */
export function BffHelpSurface({
  open,
  onOpen,
  onClose,
  title,
  subtitle = 'Answers and guidance',
  layout = 'content',
  launcherLabel = 'Help',
  closeLabel = 'Close help',
  children,
  className,
  style,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  subtitle?: string;
  layout?: 'chat' | 'content';
  launcherLabel?: string;
  closeLabel?: string;
  children?: ReactNode;
} & AssistantPresentation) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousView = useRef({ open: false, title, layout });
  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const element = dialog.current;
    element?.showModal();
    element
      ?.querySelector<HTMLButtonElement>('.bff-help-close')
      ?.focus({ preventScroll: true });
    const visible = window.visualViewport;
    const clearViewport = () => {
      element?.style.removeProperty('--bff-help-visible-height');
      element?.style.removeProperty('--bff-help-visible-top');
    };
    const syncViewport = () => {
      // The keyboard can shrink/pan only the visual viewport. Do not shrink
      // content to a pinched viewport: users must retain normal zoom/panning.
      if (!visible || visible.scale !== 1 || visible.height <= 0) {
        clearViewport();
        return;
      }
      element?.style.setProperty(
        '--bff-help-visible-height',
        `${visible.height}px`,
      );
      element?.style.setProperty(
        '--bff-help-visible-top',
        `${visible.offsetTop}px`,
      );
    };
    syncViewport();
    visible?.addEventListener('resize', syncViewport);
    visible?.addEventListener('scroll', syncViewport);
    return () => {
      visible?.removeEventListener('resize', syncViewport);
      visible?.removeEventListener('scroll', syncViewport);
      clearViewport();
      element?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  useEffect(() => {
    const previous = previousView.current;
    previousView.current = { open, title, layout };
    if (
      open &&
      previous.open &&
      (previous.title !== title || previous.layout !== layout)
    )
      heading.current?.focus({ preventScroll: true });
  }, [open, title, layout]);
  return (
    <div
      className={presentationClass('bff-help-surface', className)}
      style={style}
    >
      <button
        type="button"
        className="bff-help-launcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        onClick={onOpen}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3v-6A7.5 7.5 0 1 1 20 11.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 9h8M8 13h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span>{launcherLabel}</span>
      </button>
      <dialog
        id={`${id}-dialog`}
        className="bff-help-dialog"
        ref={dialog}
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <header>
          <span className="bff-help-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 11a8 8 0 0 1-8 8H8l-4 3V11a8 8 0 1 1 16 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M8 9h8M8 13h5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="bff-help-heading">
            <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>
              {title}
            </h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="bff-help-close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div
          className={`bff-help-body${layout === 'chat' ? ' bff-help-body-chat' : ''}`}
        >
          {children}
        </div>
      </dialog>
    </div>
  );
}

export interface OperationsConnection {
  apiBaseUrl: string;
  environmentKey: string;
  getAccessToken: () => Promise<string | null>;
}
export interface AssistantPageLink {
  toolName: string;
  label: string;
  path: string;
}
function safePageLink(link: AssistantPageLink): boolean {
  return (
    link.path.startsWith('/') &&
    !link.path.startsWith('//') &&
    !link.path.includes('\\') &&
    !Array.from(link.path).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  );
}

interface MarkdownTree {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: MarkdownTree[];
}
function uniqueMarkdownLinks(offeredPaths: readonly string[]) {
  return () => (tree: MarkdownTree) => {
    const seen = new Set(offeredPaths);
    const visit = (node: MarkdownTree) => {
      const href = node.properties?.href;
      if (node.tagName === 'a' && typeof href === 'string') {
        if (seen.has(href)) {
          node.tagName = 'span';
          node.properties = {};
        } else seen.add(href);
      }
      node.children = node.children?.filter((child) => {
        const onlyLink =
          child.tagName === 'p' && child.children?.length === 1
            ? child.children[0]
            : undefined;
        if (
          onlyLink?.tagName === 'a' &&
          typeof onlyLink.properties?.href === 'string' &&
          seen.has(onlyLink.properties.href)
        )
          return false;
        visit(child);
        return true;
      });
    };
    visit(tree);
  };
}

/** Combine model/tool continuations for display only; keep SDK and saved IDs intact. */
function helperDisplayMessages(messages: UIMessage[]): UIMessage[] {
  const display: UIMessage[] = [];
  for (const message of messages) {
    const previous = display.at(-1);
    if (message.role === 'assistant' && previous?.role === 'assistant') {
      display[display.length - 1] = {
        ...message,
        parts: [...previous.parts, ...message.parts],
      };
    } else display.push(message);
  }
  return display;
}
function offeredPageLinks(
  message: UIMessage,
  links: readonly AssistantPageLink[],
) {
  const offered = new Map<string, AssistantPageLink>();
  for (const part of message.parts) {
    if (
      (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) &&
      'state' in part &&
      part.state === 'output-available' &&
      'output' in part &&
      typeof part.output === 'object' &&
      part.output &&
      'offered' in part.output &&
      part.output.offered === true &&
      'destination' in part.output
    ) {
      const link = links.find(
        (item) =>
          safePageLink(item) &&
          item.toolName ===
            (part.type === 'dynamic-tool' && 'toolName' in part
              ? part.toolName
              : part.type.slice('tool-'.length)) &&
          item.path === (part.output as { destination?: unknown }).destination,
      );
      if (link) offered.set(link.path, link);
    }
  }
  return [...offered.values()];
}

function contentDirection(content: ReactNode): 'rtl' | 'auto' {
  const text = plainNodeText(content);
  const letters = text.match(/\p{Letter}/gu) ?? [];
  const rtlLetters = letters.filter((letter) =>
    /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Adlam}]/u.test(
      letter,
    ),
  ).length;
  // First-strong auto alone misreads RTL paragraphs starting with a Latin brand.
  // Choose RTL for predominantly RTL content; otherwise let the browser decide.
  return rtlLetters > letters.length - rtlLetters ? 'rtl' : 'auto';
}
function plainNodeText(content: ReactNode): string {
  // Flatten display content only, without rendering or executing components.
  let text = '';
  Children.forEach(content, (child) => {
    if (typeof child === 'string' || typeof child === 'number') text += child;
    else if (isValidElement<{ children?: ReactNode }>(child))
      text += plainNodeText(child.props.children);
  });
  return text;
}

/** Model text is content, never HTML, remote media or a new navigation capability. */
function AssistantMarkdown({
  text,
  links,
  renderLink,
  offeredPaths,
}: {
  text: string;
  links: readonly AssistantPageLink[];
  renderLink: (link: AssistantPageLink) => ReactNode;
  offeredPaths: readonly string[];
}) {
  return (
    <div className="bff-helper-markdown">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[uniqueMarkdownLinks(offeredPaths)]}
        components={{
          a: ({ href, children }) => {
            const link = links.find(
              (item) => safePageLink(item) && item.path === href,
            );
            return link ? (
              <bdi>{renderLink(link)}</bdi>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ alt }) => (alt ? <span>{alt}</span> : null),
          p: ({ children }) => (
            <p dir={contentDirection(children)}>{children}</p>
          ),
          h1: ({ children }) => (
            <h3 dir={contentDirection(children)}>{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 dir={contentDirection(children)}>{children}</h3>
          ),
          h3: ({ children }) => (
            <h3 dir={contentDirection(children)}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 dir={contentDirection(children)}>{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 dir={contentDirection(children)}>{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 dir={contentDirection(children)}>{children}</h6>
          ),
          ol: ({ children, start }) => (
            <ol dir={contentDirection(children)} start={start}>
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul dir={contentDirection(children)}>{children}</ul>
          ),
          blockquote: ({ children }) => (
            <blockquote dir={contentDirection(children)}>{children}</blockquote>
          ),
          pre: ({ children }) => <pre dir="auto">{children}</pre>,
          code: ({ className, children }) => (
            <code dir="ltr" className={className}>
              {children}
            </code>
          ),
          th: ({ children }) => (
            <th dir={contentDirection(children)}>{children}</th>
          ),
          td: ({ children }) => (
            <td dir={contentDirection(children)}>{children}</td>
          ),
          table: ({ children }) => (
            <div
              className="bff-helper-table"
              role="region"
              aria-label="Answer table"
              tabIndex={0}
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
interface HelperSession {
  conversationId?: string;
  capability?: string;
  mocked?: boolean;
}
export class OperationsRequestError extends Error {
  constructor(readonly status: number) {
    super(
      status === 429
        ? 'The service is temporarily at its limit. Please use the contact options below.'
        : status === 401 || status === 403
          ? 'Your session needs to be checked again. You can still contact support by email.'
          : 'The service could not complete this request. Your message is still here. Please try again.',
    );
  }
}

export function operationsUrl(
  connection: Pick<OperationsConnection, 'apiBaseUrl' | 'environmentKey'>,
  path: string,
) {
  const url = new URL(
    `${connection.apiBaseUrl.replace(/\/$/u, '')}/v1/operations/${path}`,
  );
  url.searchParams.set('environmentKey', connection.environmentKey);
  return url.toString();
}

export async function operationsRequest<T>(
  connection: OperationsConnection,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await connection.getAccessToken();
  const response = await fetch(operationsUrl(connection, path), {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'x-tofler-environment': connection.environmentKey,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new OperationsRequestError(response.status);
  return (await response.json()) as T;
}

export function helperRequestBody({
  environmentKey,
  session,
  pageKey,
  message,
  toolResults,
}: {
  environmentKey: string;
  session: HelperSession;
  pageKey: string;
  message?: { id: string; text: string };
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    output: unknown;
    contextKey: string;
  }>;
}) {
  return {
    environmentKey,
    ...(session.conversationId
      ? { conversationId: session.conversationId }
      : {}),
    ...(session.capability ? { capability: session.capability } : {}),
    page: { key: pageKey },
    ...(toolResults?.length ? { toolResults } : message ? { message } : {}),
  };
}

export function BffHelper({
  connection,
  contextKey,
  pageKey,
  productName,
  links,
  renderLink,
  onContact,
  enabled = true,
  suggestions = [],
  welcomeTitle = 'How can we help?',
  welcomeDescription,
  className,
  style,
}: {
  connection: OperationsConnection;
  contextKey: string;
  pageKey: string;
  productName: string;
  links: readonly AssistantPageLink[];
  renderLink: (link: AssistantPageLink) => ReactNode;
  onContact: (kind: 'question' | 'feedback', summary?: string) => void;
  enabled?: boolean;
  suggestions?: readonly string[];
  welcomeTitle?: string;
  welcomeDescription?: string;
} & AssistantPresentation) {
  const current = useRef({ connection, contextKey, pageKey, links });
  current.current = { connection, contextKey, pageKey, links };
  const session = useRef<HelperSession>({});
  const requestContext = useRef(contextKey);
  const toolResults = useRef<
    Array<{
      toolCallId: string;
      toolName: string;
      output: unknown;
      contextKey: string;
    }>
  >([]);
  const [input, setInput] = useState('');
  const [mocked, setMocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const sending = useRef(false);
  const composing = useRef(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const fieldId = useId();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: operationsUrl(connection, 'helper'),
        prepareSendMessagesRequest: async ({ messages }) => {
          const context = current.current;
          const token = await context.connection.getAccessToken();
          if (context.contextKey !== current.current.contextKey)
            throw new Error(
              'The current workspace or page changed. Ask again from this page.',
            );
          requestContext.current = context.contextKey;
          const latest = [...messages]
            .reverse()
            .find((message) => message.role === 'user');
          const results = toolResults.current.splice(0);
          return {
            headers: {
              'x-tofler-environment': context.connection.environmentKey,
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: helperRequestBody({
              environmentKey: context.connection.environmentKey,
              session: session.current,
              pageKey: context.pageKey,
              ...(latest
                ? {
                    message: {
                      id: latest.id,
                      text: latest.parts
                        .filter((part) => part.type === 'text')
                        .map((part) => part.text)
                        .join('\n'),
                    },
                  }
                : {}),
              ...(results.length ? { toolResults: results } : {}),
            }),
          };
        },
        fetch: async (url, init) => {
          const response = await fetch(url, init);
          if (!response.ok) throw new OperationsRequestError(response.status);
          return response;
        },
      }),
    [connection.apiBaseUrl, connection.environmentKey],
  );
  const chat = useChat<UIMessage>({
    transport,
    sendAutomaticallyWhen: (state) =>
      toolResults.current.length > 0 &&
      lastAssistantMessageIsCompleteWithToolCalls(state),
    onData: (part) => {
      if (
        part.type !== 'data-session' ||
        typeof part.data !== 'object' ||
        !part.data
      )
        return;
      const data = part.data as HelperSession;
      if (
        typeof data.conversationId === 'string' &&
        requestContext.current === current.current.contextKey
      ) {
        session.current = {
          conversationId: data.conversationId,
          ...(typeof data.capability === 'string'
            ? { capability: data.capability }
            : {}),
        };
        setMocked(data.mocked === true);
      }
    },
    onToolCall: ({ toolCall }) => {
      const scope = current.current;
      const link = scope.links.find(
        (item) => item.toolName === toolCall.toolName,
      );
      const valid =
        requestContext.current === scope.contextKey &&
        link &&
        safePageLink(link);
      const input = toolCall.input;
      const boundedArguments =
        input === undefined ||
        input === null ||
        (typeof input === 'object' &&
          !Array.isArray(input) &&
          Object.keys(input).length === 0);
      const output =
        valid && boundedArguments
          ? { offered: true, destination: link.path, label: link.label }
          : {
              offered: false,
              reason: 'This page action is unavailable in the current context.',
            };
      toolResults.current.push({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        output,
        contextKey: scope.contextKey,
      });
      void chat.addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output,
      });
    },
  });
  const previousContext = useRef(contextKey);
  useEffect(() => {
    if (previousContext.current !== contextKey) {
      void chat.stop();
      toolResults.current = [];
      previousContext.current = contextKey;
    }
  }, [contextKey, chat.stop]);
  useEffect(
    () => () => {
      void chat.stop();
    },
    [chat.stop],
  );
  const busy = chat.status === 'submitted' || chat.status === 'streaming';
  const last = chat.messages.at(-1);
  const latestAnswer = last?.role === 'assistant' && !busy ? last : null;
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (following.current) {
      element.scrollTop = element.scrollHeight;
      setHasNewMessages(false);
    } else if (last?.role === 'assistant') {
      setHasNewMessages(true);
    }
  }, [chat.messages, busy, last?.role]);
  useEffect(() => {
    const resize = () => {
      const element = composer.current;
      if (!element) return;
      element.style.height = 'auto';
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 24;
      element.style.height = `${Math.min(Math.max(element.scrollHeight, 48), lineHeight * 5 + 24)}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [input]);
  const send = async (text: string) => {
    if (!text.trim() || busy || sending.current || !enabled) return;
    sending.current = true;
    following.current = true;
    setInput('');
    setFeedback(null);
    setFeedbackError(false);
    chat.clearError();
    composer.current?.focus({ preventScroll: true });
    try {
      await chat.sendMessage({ text: text.trim() });
    } catch {
      /* useChat exposes the preserved conversation and error. */
    } finally {
      sending.current = false;
    }
  };
  return (
    <div className={presentationClass('bff-helper', className)} style={style}>
      <div
        className="bff-helper-transcript"
        ref={viewport}
        onScroll={() => {
          const element = viewport.current;
          if (!element) return;
          following.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            64;
          if (following.current) setHasNewMessages(false);
        }}
      >
        {mocked ? (
          <p className="bff-support-notice bff-helper-notice" role="status">
            Development mock · responses are synthetic, not live AI.
          </p>
        ) : null}
        {!enabled ? (
          <p className="bff-support-notice bff-helper-notice" role="status">
            The helper is currently unavailable. You can still use the help
            links or contact options.
          </p>
        ) : null}
        {!chat.messages.length ? (
          <div className="bff-helper-welcome">
            <span className="bff-helper-welcome-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <h3>{welcomeTitle}</h3>
            <p>
              {welcomeDescription ??
                `Ask a question about using ${productName}.`}
            </p>
          </div>
        ) : null}
        {!chat.messages.length && enabled && suggestions.length ? (
          <div className="bff-helper-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={!enabled || busy}
                onClick={() => {
                  setInput(suggestion);
                  void send(suggestion);
                }}
              >
                {suggestion}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        ) : null}
        <ol
          className="bff-helper-history"
          role="log"
          aria-label="Help conversation"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={busy}
        >
          {helperDisplayMessages(chat.messages).map((message) => {
            const offered = offeredPageLinks(message, links);
            const textParts = message.parts
              .filter((part) => part.type === 'text')
              .map((part) => part.text);
            const text = (
              message.role === 'assistant' ? [...new Set(textParts)] : textParts
            ).join('\n\n');
            return (
              <li
                key={message.id}
                className={message.role === 'user' ? 'customer' : 'answer'}
              >
                <strong className="bff-helper-sender">
                  {message.role === 'user' ? 'You' : `${productName} help`}
                </strong>
                <div
                  className="bff-helper-message"
                  dir={contentDirection(text)}
                >
                  {text ? (
                    message.role === 'user' ? (
                      <p>{text}</p>
                    ) : (
                      <AssistantMarkdown
                        text={text}
                        links={links}
                        renderLink={renderLink}
                        offeredPaths={offered.map((link) => link.path)}
                      />
                    )
                  ) : null}
                  {offered.map((link) => (
                    <bdi className="bff-helper-offered-link" key={link.path}>
                      {renderLink(link)}
                    </bdi>
                  ))}
                </div>
                {latestAnswer?.id === message.id &&
                session.current.conversationId ? (
                  <div className="bff-helper-feedback">
                    <span>Did this help?</span>
                    {(['yes', 'partly', 'no'] as const).map((choice) => (
                      <button
                        type="button"
                        key={choice}
                        aria-pressed={feedback === choice}
                        onClick={() => {
                          setFeedbackError(false);
                          void operationsRequest(connection, 'feedback', {
                            environmentKey: connection.environmentKey,
                            ...session.current,
                            answerEntryId: latestAnswer.id,
                            choice,
                          })
                            .then(() => setFeedback(choice))
                            .catch(() => setFeedbackError(true));
                        }}
                      >
                        {choice === 'yes'
                          ? 'Yes'
                          : choice === 'partly'
                            ? 'Partly'
                            : 'No'}
                      </button>
                    ))}
                    {feedback ? (
                      <span role="status">Thanks for the feedback.</span>
                    ) : null}
                    {feedbackError ? (
                      <span role="alert">
                        Feedback was not saved. Please try again.
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        {busy ? (
          <p role="status" className="bff-support-status bff-helper-waiting">
            <span className="bff-helper-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Preparing an answer…{' '}
            <button type="button" onClick={() => void chat.stop()}>
              Stop
            </button>
          </p>
        ) : null}
        {chat.error ? (
          <p className="bff-support-notice error" role="alert">
            {chat.error instanceof OperationsRequestError
              ? chat.error.message
              : 'Help could not finish this answer. Your question is preserved. Try again or contact support.'}
            <button
              type="button"
              className="bff-helper-retry"
              disabled={busy || !enabled}
              onClick={() => {
                following.current = true;
                chat.clearError();
                void chat.regenerate().catch(() => {
                  /* The failed turn stays visible. */
                });
              }}
            >
              Retry answer
            </button>
          </p>
        ) : null}
        {links.some(safePageLink) ? (
          <details className="bff-helper-links">
            <summary>Browse help links</summary>
            <div>
              {links
                .filter(safePageLink)
                .slice(0, 4)
                .map((link) => (
                  <span key={link.toolName}>{renderLink(link)}</span>
                ))}
            </div>
          </details>
        ) : null}
      </div>
      <div className="bff-helper-composer-area">
        {hasNewMessages ? (
          <button
            type="button"
            className="bff-helper-jump"
            onClick={() => {
              following.current = true;
              if (viewport.current)
                viewport.current.scrollTop = viewport.current.scrollHeight;
              setHasNewMessages(false);
            }}
          >
            ↓ Jump to latest
          </button>
        ) : null}
        <form
          className="bff-helper-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <label className="bff-support-sr-only" htmlFor={fieldId}>
            Your question
          </label>
          <textarea
            id={fieldId}
            dir="auto"
            ref={composer}
            rows={1}
            placeholder="Write a message…"
            maxLength={12000}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={!enabled}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.altKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.repeat &&
                !event.nativeEvent.isComposing &&
                !composing.current
              ) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            type="submit"
            className="bff-helper-send"
            aria-label="Send question"
            disabled={busy || !enabled || !input.trim()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m5 12 7-7 7 7M12 5v15"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </div>
      <div className="bff-support-actions bff-helper-footer">
        <button
          type="button"
          onClick={() =>
            onContact(
              'question',
              chat.messages
                .filter((message) => message.role === 'user')
                .slice(-2)
                .map((message) =>
                  message.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => part.text)
                    .join('\n'),
                )
                .join('\n\n'),
            )
          }
        >
          Contact support
        </button>
        <button type="button" onClick={() => onContact('feedback')}>
          Send feedback
        </button>
      </div>
    </div>
  );
}

export interface ContactReceipt {
  conversationId: string;
  reference: string;
  contactEmail: string;
  receiptState: string;
}
export function BffContactForm({
  connection,
  signedIn,
  contactEmail,
  signInControl,
  initialKind = 'question',
  initialMessage = '',
  replyAddress,
  workspaceName,
  enabled = true,
  additionalPrivacyNotice,
  className,
  style,
}: {
  connection: OperationsConnection;
  signedIn: boolean;
  contactEmail?: string;
  signInControl: ReactNode;
  initialKind?: 'question' | 'problem' | 'feedback';
  initialMessage?: string;
  replyAddress?: string;
  workspaceName?: string;
  enabled?: boolean;
  additionalPrivacyNotice?: string;
} & AssistantPresentation) {
  const [kind, setKind] = useState(initialKind);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ContactReceipt | null>(null);
  const key = useRef(crypto.randomUUID());
  if (receipt && signedIn)
    return (
      <div
        className={presentationClass('bff-contact-success', className)}
        style={style}
        role="status"
      >
        <h3>Your message was received</h3>
        <p>
          Reference {receipt.reference}.{' '}
          {receipt.receiptState === 'mocked'
            ? 'Development test only: no email was sent.'
            : `Follow-up is by email to ${receipt.contactEmail}.`}
        </p>
        <p>
          You do not need to send it again.{' '}
          {receipt.receiptState === 'failed'
            ? 'The confirmation email could not be delivered, but your message is saved.'
            : receipt.receiptState === 'mocked'
              ? 'The synthetic case is available to the development operator.'
              : receipt.receiptState === 'queued'
                ? 'A confirmation email is queued; delivery has not yet been confirmed.'
                : receipt.receiptState === 'sent' ||
                    receipt.receiptState === 'delivered'
                  ? 'Check your inbox for a confirmation.'
                  : 'Your message is saved; email delivery has not yet been confirmed.'}
        </p>
      </div>
    );
  const mail = contactEmail ? (
    <p className="bff-contact-email">
      <a
        href={`mailto:${contactEmail}?subject=${encodeURIComponent(subject || (kind === 'feedback' ? 'Product feedback' : 'Support question'))}`}
      >
        Send us an email
      </a>
      <span>{contactEmail}</span>
      <small>
        This opens a draft in your mail app. You choose when to send it.
      </small>
      {contactEmail.toLowerCase().endsWith('.invalid') ? (
        <small role="status">
          Development test only: this synthetic address cannot receive email.
        </small>
      ) : null}
    </p>
  ) : (
    <p className="bff-support-notice">
      The support address is not currently available. Please try again later.
    </p>
  );
  if (!signedIn)
    return (
      <div
        className={presentationClass('bff-contact-signed-out', className)}
        style={style}
      >
        <p>
          Sign in to send a message from your workspace, or email us directly.
        </p>
        {signInControl}
        {mail}
      </div>
    );
  return (
    <form
      className={presentationClass('bff-contact-form', className)}
      style={style}
      onSubmit={(event) => {
        event.preventDefault();
        if (busy || !enabled) return;
        setBusy(true);
        setError(null);
        void operationsRequest<ContactReceipt>(connection, 'contact', {
          environmentKey: connection.environmentKey,
          kind,
          subject: subject.trim(),
          message: message.trim(),
          idempotencyKey: key.current,
        })
          .then(setReceipt)
          .catch((caught: unknown) =>
            setError(
              caught instanceof OperationsRequestError
                ? caught.message
                : 'We could not confirm receipt. Your message is preserved. Submit again to check the same request; it will not create a duplicate.',
            ),
          )
          .finally(() => setBusy(false));
      }}
    >
      <p>
        We reply by email
        {replyAddress ? (
          <>
            {' '}
            to <strong>{replyAddress}</strong>
          </>
        ) : null}
        .
        {workspaceName ? (
          <>
            {' '}
            Workspace: <strong>{workspaceName}</strong>.
          </>
        ) : null}
      </p>
      {initialMessage ? (
        <p className="bff-support-notice">
          Review and edit the summary below before sending. Opening this form
          has not created a case.
        </p>
      ) : null}
      <label className="bff-support-field">
        What would you like to share?
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
        >
          <option value="question">Question</option>
          <option value="problem">Problem</option>
          <option value="feedback">Feedback or suggestion</option>
        </select>
      </label>
      <label className="bff-support-field">
        Subject
        <input
          required
          maxLength={200}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </label>
      <label className="bff-support-field">
        Message
        <textarea
          required
          rows={7}
          maxLength={12000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      <p className="bff-support-secondary">
        Please leave out passwords, access tokens and payment details.
        {additionalPrivacyNotice ? <> {additionalPrivacyNotice}</> : null}{' '}
        Suggestions help us learn; submitting one does not promise it will be
        built.
      </p>
      {error ? (
        <p className="bff-support-notice error" role="alert">
          {error}
        </p>
      ) : null}
      {!enabled ? (
        <p className="bff-support-notice">
          The website form is currently unavailable. Please use email.
        </p>
      ) : null}
      <button
        className="bff-support-button"
        disabled={busy || !enabled || !subject.trim() || !message.trim()}
      >
        {busy ? 'Sending your message…' : 'Send message'}
      </button>
      {mail}
    </form>
  );
}

export function BffSupportSurvey({
  className,
  style,
  ...props
}: Parameters<typeof ScopedSupportSurvey>[0] & AssistantPresentation) {
  return (
    <div
      className={presentationClass('bff-support-survey-surface', className)}
      style={style}
    >
      <ScopedSupportSurvey
        key={`${props.connection.apiBaseUrl}:${props.connection.environmentKey}:${props.token}`}
        {...props}
      />
    </div>
  );
}
function ScopedSupportSurvey({
  connection,
  token,
  initialChoice,
}: {
  connection: OperationsConnection;
  token: string;
  initialChoice?: 'yes' | 'partly' | 'no';
}) {
  const [state, setState] = useState<{
    question?: string;
    productName?: string;
    active?: boolean;
  }>();
  const [choice, setChoice] = useState(initialChoice);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void operationsRequest<{
      question?: string;
      productName?: string;
      active?: boolean;
    }>(connection, `survey?token=${encodeURIComponent(token)}`)
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() => {
        if (active)
          setError(
            'This feedback link is unavailable or has expired. You can still contact support.',
          );
      });
    return () => {
      active = false;
    };
  }, [connection.apiBaseUrl, connection.environmentKey, token]);
  if (sent)
    return (
      <div role="status">
        <h2>Thank you for your feedback</h2>
        <p>
          Your response was saved. If you still need help, reply to the support
          email.
        </p>
      </div>
    );
  if (error && !state) return <p role="alert">{error}</p>;
  if (!state) return <p role="status">Loading feedback invitation…</p>;
  if (state.active === false)
    return (
      <p>
        This feedback invitation is not available. You can still reply to the
        support email.
      </p>
    );
  return (
    <form
      className="bff-support-survey"
      onSubmit={(event) => {
        event.preventDefault();
        if (!choice || busy) return;
        setBusy(true);
        setError(null);
        void operationsRequest(connection, 'survey', {
          token,
          choice,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        })
          .then(() => setSent(true))
          .catch(() =>
            setError('Your response was not saved. Please try again.'),
          )
          .finally(() => setBusy(false));
      }}
    >
      <h2>{state.question ?? 'Did you get the help you needed?'}</h2>
      <fieldset>
        <legend>Your answer</legend>
        {(['yes', 'partly', 'no'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="support-feedback"
              checked={choice === value}
              onChange={() => setChoice(value)}
            />
            {value === 'yes' ? 'Yes' : value === 'partly' ? 'Partly' : 'No'}
          </label>
        ))}
      </fieldset>
      <label className="bff-support-field">
        {choice === 'partly' || choice === 'no'
          ? 'What was missing? (optional)'
          : 'Anything else to share? (optional)'}
        <textarea
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button className="bff-support-button" disabled={!choice || busy}>
        {busy ? 'Saving…' : 'Send feedback'}
      </button>
    </form>
  );
}
