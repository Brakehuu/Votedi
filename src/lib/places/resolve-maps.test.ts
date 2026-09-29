import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { classifyOptionLine } from "./classify-line";
import { followMapsRedirects, resolveMapsUrl } from "./resolve-maps";

describe("classifyOptionLine", () => {
  it("maps short link → place", () => {
    const r = classifyOptionLine("https://maps.app.goo.gl/kKAuZswVtycCroSF7");
    assert.equal(r.kind, "place");
  });

  it("never classifies URL as text", () => {
    assert.equal(classifyOptionLine("https://shopee.vn/foo").kind, "link");
    assert.equal(classifyOptionLine("https://www.google.com/maps?q=1,2").kind, "place");
    assert.equal(classifyOptionLine("🍜 Phở").kind, "text");
  });
});

describe("followMapsRedirects (mocked)", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("follows maps.app.goo.gl → consent → continue → /maps/place/", async () => {
    const short = "https://maps.app.goo.gl/kKAuZswVtycCroSF7";
    const consent =
      "https://consent.google.com/m?continue=" +
      encodeURIComponent(
        "https://www.google.com/maps/place/Nh%C3%A0+h%C3%A0ng+Ngon/@10.776889,106.700806,17z",
      );
    const place = "https://www.google.com/maps/place/Nh%C3%A0+h%C3%A0ng+Ngon/@10.776889,106.700806,17z";

    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("maps.app.goo.gl")) {
        return new Response(null, { status: 302, headers: { location: consent } });
      }
      if (url.includes("consent.google.com")) {
        return new Response(null, {
          status: 302,
          headers: { location: place },
        });
      }
      return new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
    });

    const parsed = await resolveMapsUrl(short);
    assert.equal(parsed.name, "Nhà hàng Ngon");
    assert.equal(parsed.lat, 10.776889);
    assert.equal(parsed.lng, 106.700806);
    assert.ok(parsed.mapsUrl.includes("/maps/place/"));
  });

  it("extracts canonical from 200 HTML when no Location header", async () => {
    const short = "https://maps.app.goo.gl/kKAuZswVtycCroSF7";
    const place = "https://www.google.com/maps/place/Cafe+ABC/@21.028511,105.804817,17z";
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("maps.app.goo.gl")) {
        return new Response(
          `<html><head><link rel="canonical" href="${place}"/></head></html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }
      return new Response("ok", { status: 200 });
    });

    const finalUrl = await followMapsRedirects(short);
    assert.equal(finalUrl, place);
    const parsed = await resolveMapsUrl(short);
    assert.equal(parsed.name, "Cafe ABC");
    assert.equal(parsed.lat, 21.028511);
  });
});
