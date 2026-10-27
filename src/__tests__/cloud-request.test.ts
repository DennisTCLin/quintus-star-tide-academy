import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "../cloud";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("cloud requests on older Safari", () => {
  it("sends login even when AbortSignal.timeout is unavailable", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("AbortSignal", {});
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ username: "feifei" }) });
    vi.stubGlobal("fetch", fetcher);
    await expect(request("login", { username: "Feifei", password: "test-only" })).resolves.toEqual({username:"feifei"});
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe("/api/login");
    expect(fetcher.mock.calls[0][1]).toMatchObject({method:"POST",credentials:"same-origin",cache:"no-store"});
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("still aborts stalled connections after twelve seconds and releases the timer", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal;
    vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => {
      signal = options.signal;
      signal.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const result = request("state").catch(e => e);
    await vi.advanceTimersByTimeAsync(11999);
    expect(signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal!.aborted).toBe(true);
    expect(await result).toMatchObject({status:0});
    expect(vi.getTimerCount()).toBe(0);
  });
  it("preserves invalid-password errors rather than calling them connection failures", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:false,status:401,json:async()=>({error:"帳號或密碼不正確"})}));
    await expect(request("login",{})).rejects.toMatchObject({status:401,message:"帳號或密碼不正確"});
    expect(vi.getTimerCount()).toBe(0);
  });
});
