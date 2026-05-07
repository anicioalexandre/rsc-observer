export type Event =
  | {
      kind: "request_start";
      requestId: string;
      url: string;
      method: string;
      isRSC: boolean;
      t: number;
    }
  | { kind: "request_end"; requestId: string; status: number; t: number }
  | {
      kind: "server_fetch";
      requestId: string;
      id: string;
      url: string;
      method: string;
      start: number;
      end: number;
      status: number;
      sizeBytes: number;
      ownerStack?: string;
    }
  | {
      kind: "rsc_chunk";
      requestId: string;
      index: number;
      bytes: number;
      data: string;
      t: number;
    }
  | {
      kind: "rsc_chunk_received";
      requestId: string;
      index: number;
      bytes: number;
      t: number;
    }
  | {
      kind: "server_action";
      requestId: string;
      name: string;
      start: number;
      end: number;
      argsPreview: string;
      resultPreview: string;
    }
  | {
      kind: "client_nav_start";
      url: string;
      navigationType: "push" | "replace" | "traverse";
      t: number;
    }
  | {
      kind: "client_perf";
      entryType: string;
      name: string;
      t: number;
      duration?: number;
    }
  | {
      kind: "client_fetch";
      id: string;
      url: string;
      method: string;
      start: number;
      end: number;
      status: number;
      sizeBytes: number;
    }
  | {
      // JS / CSS chunk loads observed via PerformanceObserver "resource"
      // entries. These are the bundles for client components — once the
      // chunk lands, that subtree can hydrate.
      kind: "client_chunk";
      url: string;
      chunkType: "script" | "css";
      start: number;
      end: number;
      sizeBytes: number;
    }
  | { kind: "request_error"; requestId: string; message: string; digest?: string };
