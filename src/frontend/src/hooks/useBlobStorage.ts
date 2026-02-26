import { useCallback } from "react";
import { useActor } from "./useActor";
import { ExternalBlob } from "../backend";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";
import { HttpAgent } from "@icp-sdk/core/agent";

const MOTOKO_DEDUPLICATION_SENTINEL = "!caf!";

export function useBlobStorage() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  const getBlobUrl = useCallback(
    (blobId: string | undefined): string => {
      if (!blobId) return "";
      // If it's already a URL, use it directly
      if (blobId.startsWith("http")) return blobId;
      return blobId;
    },
    []
  );

  const getExternalBlobUrl = useCallback(
    async (blobId: string | undefined): Promise<string> => {
      if (!blobId) return "";
      if (blobId.startsWith("http")) return blobId;
      try {
        const config = await loadConfig();
        const agentOptions = identity ? { identity } : {};
        const agent = new HttpAgent({
          ...agentOptions,
          host: config.backend_host,
        });
        const storageClient = new StorageClient(
          config.bucket_name,
          config.storage_gateway_url,
          config.backend_canister_id,
          config.project_id,
          agent
        );
        // blobId is the hash (possibly with sentinel)
        const hash = blobId.startsWith(MOTOKO_DEDUPLICATION_SENTINEL)
          ? blobId.substring(MOTOKO_DEDUPLICATION_SENTINEL.length)
          : blobId;
        return await storageClient.getDirectURL(hash);
      } catch (e) {
        console.error("Error getting blob URL:", e);
        return "";
      }
    },
    [identity]
  );

  const upload = useCallback(
    async (file: File): Promise<string> => {
      if (!actor) throw new Error("Actor not available");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      // Use the actor's storage infrastructure by creating a post with the file
      // The blob upload happens through the actor's uploadFile mechanism
      const config = await loadConfig();
      const agentOptions = identity ? { identity } : {};
      const agent = new HttpAgent({
        ...agentOptions,
        host: config.backend_host,
      });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(console.error);
      }
      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent
      );
      const blobBytes = await blob.getBytes();
      const { hash } = await storageClient.putFile(blobBytes);
      return MOTOKO_DEDUPLICATION_SENTINEL + hash;
    },
    [actor, identity]
  );

  return { upload, getBlobUrl, getExternalBlobUrl };
}
