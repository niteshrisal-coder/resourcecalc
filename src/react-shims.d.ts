declare module 'react' {
  export type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
  export interface ReactElement {
    type: any;
    props: any;
    key: string | number | null;
  }

  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  export type ChangeEvent<T = any> = { target: { value: string }; preventDefault?: () => void } & Event;
  export type MouseEvent<T = any> = { stopPropagation: () => void } & Event;

  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type Dispatch<A> = (value: A) => void;
  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function createElement(type: any, props?: any, ...children: any[]): any;
  export const Fragment: any;
  export default any;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: string | number): any;
  export function jsxs(type: any, props: any, key?: string | number): any;
  export function jsxDEV(type: any, props: any, key?: string | number, isStaticChildren?: boolean): any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
