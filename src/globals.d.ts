declare module 'escape-path-with-spaces';
declare module 'shell-path' {
  export function shellPath(): Promise<string | undefined>;
}

declare module "*.md" {
  const text: string;
  export default text;
}
