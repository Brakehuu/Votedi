import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMapsShortLink, parseMapsUrl } from "./parse-maps-url";

describe("parseMapsUrl", () => {
  it("parses /maps/place/<Name>/@lat,lng", () => {
    const r = parseMapsUrl(
      "https://www.google.com/maps/place/Nh%C3%A0+h%C3%A0ng+Ng%C3%B4n/@10.776889,106.700806,17z",
    );
    assert.equal(r.name, "Nhà hàng Ngôn");
    assert.equal(r.lat, 10.776889);
    assert.equal(r.lng, 106.700806);
  });

  it("prefers !3d!4d over @ coordinates", () => {
    const r = parseMapsUrl(
      "https://www.google.com/maps/place/Cafe+ABC/@10.1,106.1,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d21.028511!4d105.804817",
    );
    assert.equal(r.name, "Cafe ABC");
    assert.equal(r.lat, 21.028511);
    assert.equal(r.lng, 105.804817);
  });

  it("parses ?q=lat,lng", () => {
    const r = parseMapsUrl("https://www.google.com/maps?q=10.762622,106.660172");
    assert.equal(r.lat, 10.762622);
    assert.equal(r.lng, 106.660172);
    assert.equal(r.name, null);
  });

  it("parses ?q=<name> without coordinates", () => {
    const r = parseMapsUrl("https://www.google.com/maps?q=B%C3%BAn+ch%E1%BA%A3+H%C3%A0+N%E1%BB%99i");
    assert.equal(r.name, "Bún chả Hà Nội");
    assert.equal(r.lat, null);
    assert.equal(r.lng, null);
  });

  it("parses maps.google.com/?cid=… without coords", () => {
    const r = parseMapsUrl("https://maps.google.com/?cid=1234567890");
    assert.equal(r.hint, "cid");
    assert.equal(r.lat, null);
    assert.equal(r.name, null);
  });

  it("flags maps.app.goo.gl short links", () => {
    const r = parseMapsUrl("https://maps.app.goo.gl/AbCdEfGhIjK");
    assert.equal(r.hint, "short_link");
    assert.equal(isMapsShortLink(new URL(r.mapsUrl)), true);
  });

  it("flags goo.gl/maps short links", () => {
    const r = parseMapsUrl("https://goo.gl/maps/XyZ123");
    assert.equal(r.hint, "short_link");
  });

  it("rejects non-Maps hosts", () => {
    assert.throws(() => parseMapsUrl("https://example.com/maps/place/Foo"), /NOT_MAPS/);
  });

  it("rejects non-http schemes", () => {
    assert.throws(() => parseMapsUrl("ftp://www.google.com/maps?q=1,2"), /INVALID_URL/);
  });

  it("decodes plus and percent in place names", () => {
    const r = parseMapsUrl("https://www.google.com/maps/place/Ph%E1%BB%9F+B%C3%B2/@21.0,105.8,17z");
    assert.equal(r.name, "Phở Bò");
  });
});
