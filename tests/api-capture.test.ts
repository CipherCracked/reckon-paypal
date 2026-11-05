import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/paypal/orders/[id]/capture/route";
import { capturePayPalOrder } from "@/lib/paypal/orders";
import { PayPalError } from "@/lib/paypal/client";

vi.mock("@/lib/paypal/orders", () => ({
  capturePayPalOrder: vi.fn(),
}));

const capture = (id = "ORDER-1") =>
  POST(new Request(`http://localhost/api/paypal/orders/${id}/capture`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.mocked(capturePayPalOrder).mockReset();
});

describe("POST /api/paypal/orders/:id/capture", () => {
  it("captures the order and returns the captured amount", async () => {
    vi.mocked(capturePayPalOrder).mockResolvedValueOnce({
      id: "ORDER-1",
      status: "COMPLETED",
      amount: { currency: "USD", minor: 5895 },
    });

    const response = await capture();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("COMPLETED");
    expect(body.amount).toEqual({ currency: "USD", minor: 5895 });
  });

  it("treats an already-captured order as success, so a retry never charges twice", async () => {
    vi.mocked(capturePayPalOrder).mockRejectedValueOnce(
      new PayPalError("PayPal returned ORDER_ALREADY_CAPTURED.", 422, "ORDER_ALREADY_CAPTURED"),
    );

    const response = await capture();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ALREADY_CAPTURED");
    expect(body.amount).toBeNull();
  });

  it("returns 502 with the PayPal issue text for any other failure", async () => {
    vi.mocked(capturePayPalOrder).mockRejectedValueOnce(
      new PayPalError("PayPal returned INSTRUMENT_DECLINED.", 422, "INSTRUMENT_DECLINED"),
    );

    const response = await capture();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toContain("INSTRUMENT_DECLINED");
  });
});
