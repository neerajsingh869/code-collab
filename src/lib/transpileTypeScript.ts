import { loader } from "@monaco-editor/react";

// Monaco already ships the TypeScript compiler to power its language service,
// so we borrow that worker and keep a second copy of typescript out of the
// bundle just to strip annotations. This is transpile-only: type errors
// still surface as squiggles in the editor, never at runtime.
export async function transpileTypeScript(code: string): Promise<string> {
  const monaco = await loader.init();

  // a throwaway model, so emitting never disturbs the one the editor is using
  const uri = monaco.Uri.parse(`inmemory://run/${crypto.randomUUID()}.ts`);
  const model = monaco.editor.createModel(code, "typescript", uri);

  try {
    const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
    const client = await getWorker(uri);
    const emitted = await client.getEmitOutput(uri.toString());
    const js = emitted.outputFiles.find((file: { name: string }) =>
      file.name.endsWith(".js"),
    );
    return js ? js.text : code;
  } finally {
    model.dispose();
  }
}
