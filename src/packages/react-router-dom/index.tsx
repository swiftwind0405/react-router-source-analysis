import * as React from "react";
import { createBrowserHistory, createHashHistory, createPath } from "history";
import {
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Router,
  Routes,
  createRoutesFromChildren,
  generatePath,
  matchRoutes,
  matchPath,
  resolvePath,
  renderMatches,
  useHref,
  useInRouterContext,
  useLocation,
  useMatch,
  useNavigate,
  useOutlet,
  useParams,
  useResolvedPath,
  useRoutes
} from "react-router";
import type { BrowserHistory, HashHistory, State, To } from "history";

function warning(cond: boolean, message: string): void {
  if (!cond) {
    // eslint-disable-next-line no-console
    if (typeof console !== "undefined") console.warn(message);

    try {
      // Welcome to debugging React Router!
      //
      // This error is thrown as a convenience so you can more easily
      // find the source for a warning that appears in the console by
      // enabling "pause on exceptions" in your JavaScript debugger.
      throw new Error(message);
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
}

////////////////////////////////////////////////////////////////////////////////
// RE-EXPORTS
////////////////////////////////////////////////////////////////////////////////

// Note: Keep in sync with react-router exports!
export {
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Router,
  Routes,
  createRoutesFromChildren,
  generatePath,
  matchRoutes,
  matchPath,
  renderMatches,
  resolvePath,
  useHref,
  useInRouterContext,
  useLocation,
  useMatch,
  useNavigate,
  useOutlet,
  useParams,
  useResolvedPath,
  useRoutes
};

export type {
  MemoryRouterProps,
  NavigateFunction,
  NavigateOptions,
  NavigateProps,
  Navigator,
  OutletProps,
  Params,
  PathMatch,
  RouteMatch,
  RouteObject,
  RouteProps,
  PathRouteProps,
  LayoutRouteProps,
  IndexRouteProps,
  RouterProps,
  RoutesProps
} from "react-router";

///////////////////////////////////////////////////////////////////////////////
// DANGER! PLEASE READ ME!
// We provide these exports as an escape hatch in the event that you need any
// routing data that we don't provide an explicit API for. With that said, we
// want to cover your use case if we can, so if you feel the need to use these
// we want to hear from you. Let us know what you're building and we'll do our
// best to make sure we can support you!
//
// We consider these exports an implementation detail and do not guarantee
// against any breaking changes, regardless of the semver release. Use with
// extreme caution and only if you understand the consequences. Godspeed.
///////////////////////////////////////////////////////////////////////////////

/** @internal */
export {
  UNSAFE_NavigationContext,
  UNSAFE_LocationContext,
  UNSAFE_RouteContext
} from "react-router";

////////////////////////////////////////////////////////////////////////////////
// COMPONENTS
////////////////////////////////////////////////////////////////////////////////

export interface BrowserRouterProps {
  basename?: string;
  children?: React.ReactNode;
  window?: Window;
}

/**
 * @description 里面会生成`history`，并把`setState<{action; location}>`放入对应的`listeners`，那么路由切换就会`setState`了
 * 
 * A <Router> for use in web browsers. Provides the cleanest URLs.
 */
export function BrowserRouter({
  basename,
  children,
  window
}: BrowserRouterProps) {
  debugger
  const historyRef = React.useRef<BrowserHistory>();
  if (historyRef.current == null) {
    // 如果为空，则创建
    historyRef.current = createBrowserHistory({ window });
  }

  const history = historyRef.current;
  const [state, setState] = React.useState({
    action: history.action,
    location: history.location
  });

  React.useLayoutEffect(() => {
    debugger
    /**
     * popstate、push、replace时如果没有blokcers的话，会调用applyTx(nextAction)触发这里的setState
     * function applyTx(nextAction: Action) {
     *   action = nextAction;
     * //  获取当前index和location
     *   [index, location] = getIndexAndLocation();
     *   listeners.call({ action, location });
     * }
     */
    history.listen(setState)
  }, [history]);
  // 一般变化的就是action和location
  return (
    <Router
      basename={basename}
      children={children}
      action={state.action}
      location={state.location}
      navigator={history}
    />
  );
}

export interface HashRouterProps {
  basename?: string;
  children?: React.ReactNode;
  window?: Window;
}

/**
 * A <Router> for use in web browsers. Stores the location in the hash
 * portion of the URL so it is not sent to the server.
 */
export function HashRouter({ basename, children, window }: HashRouterProps) {
  const historyRef = React.useRef<HashHistory>();
  if (historyRef.current == null) {
    historyRef.current = createHashHistory({ window });
  }

  const history = historyRef.current;
  const [state, setState] = React.useState({
    action: history.action,
    location: history.location
  });

  React.useLayoutEffect(() => history.listen(setState), [history]);

  return (
    <Router
      basename={basename}
      children={children}
      action={state.action}
      location={state.location}
      navigator={history}
    />
  );
}
/** 是否是修饰符事件，包括meta、alt、ctrl、shift */
function isModifiedEvent(event: React.MouseEvent) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  replace?: boolean;
  state?: State;
  to: To;
}

/**
 * @description 实质上封装了 `<a>`
 * The public API for rendering a history-aware <a>.
 */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function LinkWithRef(
    { onClick, replace = false, state, target, to, ...rest },
    ref
  ) {
    const href = useHref(to);
    const internalOnClick = useLinkClickHandler(to, { replace, state, target });
    function handleClick(
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
    ) {
      // 如果有传onClick，那么调用该onClick
      if (onClick) onClick(event);
      // 否则如果事件的默认行为没有被阻止的话，那么调用internalOnClick，
      // 因为internalOnClick里面会调用event.preventDefault()，使event.defaultPrevented = true
      if (!event.defaultPrevented) {
        internalOnClick(event);
      }
    }

    return (
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      <a
        {...rest}
        href={href}
        onClick={handleClick}
        ref={ref}
        target={target}
      />
    );
  }
);


export interface NavLinkProps extends Omit<LinkProps, "className" | "style"> {
  caseSensitive?: boolean;
  className?: string | ((props: { isActive: boolean }) => string);
  end?: boolean;
  style?:
    | React.CSSProperties
    | ((props: { isActive: boolean }) => React.CSSProperties);
}

/**
 * @description <Link> 包装器，可以知道是否active
 * A <Link> wrapper that knows if it's "active" or not.
 */
export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  function NavLinkWithRef(
    {
      "aria-current": ariaCurrentProp = "page",
      caseSensitive = false,
      className: classNameProp = "",
      end = false,
      style: styleProp,
      to,
      ...rest
    },
    ref
  ) {
    const location = useLocation();
    const path = useResolvedPath(to);

    let locationPathname = location.pathname;
    let toPathname = path.pathname;
    if (!caseSensitive) {
      // 忽略大小写的话，统一转化为小写
      locationPathname = locationPathname.toLowerCase();
      toPathname = toPathname.toLowerCase();
    }
    /**
     * 判断是否active
     * 1. toPathname等于当前locationPathname
     * 2. 否则判断不是end的情况下，且locationPathname = `${toPathname}/xxx`
     */
    const isActive =
      locationPathname === toPathname ||
      (!end &&
        locationPathname.startsWith(toPathname) &&
        locationPathname.charAt(toPathname.length) === "/");

    const ariaCurrent = isActive ? ariaCurrentProp : undefined;

    let className: string;
    if (typeof classNameProp === "function") {
      className = classNameProp({ isActive });
    } else {
      // If the className prop is not a function, we use a default `active`
      // class for <NavLink />s that are active. In v5 `active` was the default
      // value for `activeClassName`, but we are removing that API and can still
      // use the old default behavior for a cleaner upgrade path and keep the
      // simple styling rules working as they currently do.
      className = [classNameProp, isActive ? "active" : null]
        .filter(Boolean)
        .join(" ");
    }

    const style =
      typeof styleProp === "function" ? styleProp({ isActive }) : styleProp;

    return (
      <Link
        {...rest}
        aria-current={ariaCurrent}
        className={className}
        ref={ref}
        style={style}
        to={to}
      />
    );
  }
);


////////////////////////////////////////////////////////////////////////////////
// HOOKS
////////////////////////////////////////////////////////////////////////////////

/**
 * @description 处理路由`<Link>`组件的点击行为， 比较适用于我们要自定义`<Link>`组件，和
 * `<Link>`有相同的点击行为
 * 
 * Handles the click behavior for router `<Link>` components. This is useful if
 * you need to create custom `<Link>` compoments with the same click behavior we
 * use in our exported `<Link>`.
 */
export function useLinkClickHandler<
  E extends Element = HTMLAnchorElement,
  S extends State = State
>(
  to: To,
  {
    target,
    replace: replaceProp,
    state
  }: {
    target?: React.HTMLAttributeAnchorTarget;
    replace?: boolean;
    state?: S;
  } = {}
): (event: React.MouseEvent<E, MouseEvent>) => void {
  const navigate = useNavigate();
  const location = useLocation();
  const path = useResolvedPath(to);

  return React.useCallback(
    (event: React.MouseEvent<E, MouseEvent>) => {
      if (
        event.button === 0 && // Ignore everything but left clicks 忽略除了左键外的所有内容
        (!target || target === "_self") && // Let browser handle "target=_blank" etc. 让浏览器处理"target=_blank"等
        !isModifiedEvent(event) // Ignore clicks with modifier keys 忽略meta、alt、ctrl、shift等修饰符
      ) {
        event.preventDefault();

        // If the URL hasn't changed, a regular <a> will do a replace instead of
        // a push, so do the same here.
        // 如果有传replace为true或当前location和传入path的`pathname + search + hash`相等，那么replace为true，
        // 即URL没有改变的话，<a>会使用replace而不是push
        // 比如当前路径为/basic, 点后点击<Link to='.'>，那上面的useResolvedPath(to)的path还是为{pathname: '/basic', search: '', hash: ''}
        // 那么这里的replace就满足createPath(location) === createPath(path)，即为true了，那就是replace，如果不是跳本路由，那么就为false，那就是push
        const replace =
          !!replaceProp || createPath(location) === createPath(path);
        navigate(to, { replace, state });
      }
    },
    [location, navigate, path, replaceProp, state, target, to]
  );
}

/**
 * @description 获取和设置searchParams 
 * 
 * A convenient wrapper for reading and writing search parameters via the
 * URLSearchParams interface.
 */
export function useSearchParams(defaultInit?: URLSearchParamsInit) {
  warning(
    typeof URLSearchParams !== "undefined",
    `You cannot use the \`useSearchParams\` hook in a browser that does not ` +
      `support the URLSearchParams API. If you need to support Internet ` +
      `Explorer 11, we recommend you load a polyfill such as ` +
      `https://github.com/ungap/url-search-params\n\n` +
      `If you're unsure how to load polyfills, we recommend you check out ` +
      `https://polyfill.io/v3/ which provides some recommendations about how ` +
      `to load polyfills only for users that need them, instead of for every ` +
      `user.`
  );
  // 获取默认的searchParams参数，是一个URLSearchParams实例
  const defaultSearchParamsRef = React.useRef(createSearchParams(defaultInit));

  const location = useLocation();
  const searchParams = React.useMemo(() => {
    // 根据当前location.search获取最新是searchParams
    const searchParams = createSearchParams(location.search);
    
    for (let key of defaultSearchParamsRef.current.keys()) {
      if (!searchParams.has(key)) {
        // 如果判断到最新的searchParams没有默认参数的key，那么这里要加入
        // eg: new URLSearchParams([['A', '2'], ['A', 3]]).getAll('A') => ['2', '3']
        defaultSearchParamsRef.current.getAll(key).forEach(value => {
          searchParams.append(key, value);
        });
      }
    }

    return searchParams;
  }, [location.search]);

  const navigate = useNavigate();
  const setSearchParams = React.useCallback(
    (
      nextInit: URLSearchParamsInit,
      navigateOptions?: { replace?: boolean; state?: State }
    ) => {
      // 根据nextInit得到的searchParams跳转到对应的路径
      navigate("?" + createSearchParams(nextInit), navigateOptions);
    },
    [navigate]
  );

  return [searchParams, setSearchParams] as const;
}

export type ParamKeyValuePair = [string, string];

export type URLSearchParamsInit =
  | string
  | ParamKeyValuePair[]
  | Record<string, string | string[]>
  | URLSearchParams;

/**
 * Creates a URLSearchParams object using the given initializer.
 *
 * This is identical to `new URLSearchParams(init)` except it also
 * supports arrays as values in the object form of the initializer
 * instead of just strings. This is convenient when you need multiple
 * values for a given key, but don't want to use an array initializer.
 *
 * @example:
 * 
 * - 如果 `init` 为字符串，如 init = 'a=1'
 * - 如果 `init` 为数组，那么必须为二维数组，如 init = [['a',1], ['b', '2']]
 * - 如果 `init` 为object，那么格式可以为 { a: 1, b: [1, 2, '3']}
 *
 *   const searchParams = new URLSearchParams([
 *     ['sort', 'name'],
 *     ['sort', 'price']
 *   ]);
 *
 * you can do:
 *
 *   const searchParams = createSearchParams({
 *     sort: ['name', 'price']
 *   });
 */
export function createSearchParams(
  init: URLSearchParamsInit = ""
): URLSearchParams {
  return new URLSearchParams(
    typeof init === "string" ||
    Array.isArray(init) ||
    init instanceof URLSearchParams
      ? init
      : Object.keys(init).reduce((memo, key) => {
          const value = init[key];
          return memo.concat(
            Array.isArray(value) ? value.map(v => [key, v]) : [[key, value]]
          );
        }, [] as ParamKeyValuePair[])
  );
}
