import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  BrowserMultiFormatReader,
} from "@zxing/browser";

import {
  BarcodeFormat,
} from "@zxing/library";

import ErrorMessage from "../../components/ErrorMessage";

import { createInventory } from "../../services/inventory";

import {
  completeReceivingSession,
  createReceivingSession,
  lookupInventoryByBarcode,
  receiveInventory,
} from "../../services/receiving";

import type {
  InventoryReceipt,
  ReceivingInventoryItem,
  ReceivingSession,
} from "../../types/receiving";

type ActivityItem = {
  receipt: InventoryReceipt;
  productName: string;
};

type BarcodeType =
  | "UPC-A"
  | "UPC-E"
  | "EAN-8"
  | "EAN-13"
  | "CODE-128"
  | "CODE-39"
  | "ITF";

const barcodeTypeOptions: BarcodeType[] = [
  "UPC-A",
  "UPC-E",
  "EAN-8",
  "EAN-13",
  "CODE-128",
  "CODE-39",
  "ITF",
];

function formatBarcodeType(
  format: BarcodeFormat,
): BarcodeType {
  switch (format) {
    case BarcodeFormat.UPC_A:
      return "UPC-A";

    case BarcodeFormat.UPC_E:
      return "UPC-E";

    case BarcodeFormat.EAN_8:
      return "EAN-8";

    case BarcodeFormat.EAN_13:
      return "EAN-13";

    case BarcodeFormat.CODE_39:
      return "CODE-39";

    case BarcodeFormat.ITF:
      return "ITF";

    case BarcodeFormat.CODE_128:
    default:
      return "CODE-128";
  }
}

function inferBarcodeType(
  value: string,
): BarcodeType {
  if (/^\d{12}$/.test(value)) {
    return "UPC-A";
  }

  if (/^\d{13}$/.test(value)) {
    return "EAN-13";
  }

  if (/^\d{8}$/.test(value)) {
    return "EAN-8";
  }

  return "CODE-128";
}

export default function OwnerReceivingPage() {
  const [session, setSession] =
    useState<ReceivingSession | null>(null);

  const [reference, setReference] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [barcode, setBarcode] =
    useState("");

  const [quantity, setQuantity] =
    useState("1");

  const [product, setProduct] =
    useState<ReceivingInventoryItem | null>(
      null,
    );

  const [activity, setActivity] =
    useState<ActivityItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  const [unknownBarcode, setUnknownBarcode] =
    useState("");

  const [
    detectedBarcodeType,
    setDetectedBarcodeType,
  ] = useState<BarcodeType>("UPC-A");

  const [addProductOpen, setAddProductOpen] =
    useState(false);

  const [newProductName, setNewProductName] =
    useState("");

  const [newBrand, setNewBrand] =
    useState("");

  const [newCaseCost, setNewCaseCost] =
    useState("");

  const [
    newSellingPrice,
    setNewSellingPrice,
  ] = useState("");

  const [
    newReorderLevel,
    setNewReorderLevel,
  ] = useState("5");

  const [newBarcodeType, setNewBarcodeType] =
    useState<BarcodeType>("UPC-A");

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const scannerControlsRef = useRef<{
    stop: () => void;
  } | null>(null);

  const scanLockedRef = useRef(false);

  const receiveIdempotencyKeyRef =
    useRef<string | null>(null);

  function clearUnknownBarcode() {
    setUnknownBarcode("");
    setAddProductOpen(false);

    setNewProductName("");
    setNewBrand("");
    setNewCaseCost("");
    setNewSellingPrice("");
    setNewReorderLevel("5");
  }

  async function lookupBarcode(
    barcodeValue: string,
    barcodeType?: BarcodeType,
  ) {
    const normalizedBarcode =
      barcodeValue.trim();

    if (!normalizedBarcode) {
      setError("Enter or scan a barcode.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      clearUnknownBarcode();

      const result =
        await lookupInventoryByBarcode(
          normalizedBarcode,
        );

      setBarcode(normalizedBarcode);
      setProduct(result.item);
      setQuantity("1");
    } catch (lookupError) {
      setProduct(null);

      const message =
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to find product.";

      if (
        message
          .toLowerCase()
          .includes("not found")
      ) {
        const resolvedType =
          barcodeType ??
          inferBarcodeType(
            normalizedBarcode,
          );

        setBarcode(normalizedBarcode);

        setUnknownBarcode(
          normalizedBarcode,
        );

        setDetectedBarcodeType(
          resolvedType,
        );

        setNewBarcodeType(
          resolvedType,
        );

        setError("");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }

    let disposed = false;

    async function startCamera() {
      if (!videoRef.current) {
        return;
      }

      try {
        setCameraError("");
        scanLockedRef.current = false;

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            "Camera scanning requires HTTPS or localhost.",
          );
        }

        const reader =
          new BrowserMultiFormatReader(
            undefined,
            {
              delayBetweenScanAttempts: 100,
              delayBetweenScanSuccess: 500,
            },
          );

        const constraints:
          MediaStreamConstraints = {
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1920,
            },
            height: {
              ideal: 1080,
            },
          },
          audio: false,
        };

        const controls =
          await reader.decodeFromConstraints(
            constraints,
            videoRef.current,
            (result) => {
              if (
                disposed ||
                scanLockedRef.current ||
                !result
              ) {
                return;
              }

              const scannedValue =
                result.getText().trim();

              if (!scannedValue) {
                return;
              }

              const format =
                result.getBarcodeFormat();

              const resolvedType =
                formatBarcodeType(format);

              console.log(
                "Barcode detected:",
                scannedValue,
                resolvedType,
              );

              scanLockedRef.current = true;

              controls.stop();

              scannerControlsRef.current =
                null;

              setCameraOpen(false);

              setBarcode(scannedValue);

              setDetectedBarcodeType(
                resolvedType,
              );

              void lookupBarcode(
                scannedValue,
                resolvedType,
              );
            },
          );

        if (disposed) {
          controls.stop();
          return;
        }

        scannerControlsRef.current =
          controls;
      } catch (scannerError) {
        console.error(
          "Unable to start barcode scanner:",
          scannerError,
        );

        setCameraError(
          scannerError instanceof Error
            ? scannerError.message
            : "Unable to access the camera.",
        );
      }
    }

    void startCamera();

    return () => {
      disposed = true;

      scannerControlsRef.current?.stop();

      scannerControlsRef.current = null;
    };
  }, [cameraOpen]);

  function closeCamera() {
    scannerControlsRef.current?.stop();

    scannerControlsRef.current = null;

    scanLockedRef.current = false;

    setCameraOpen(false);
    setCameraError("");
  }

  async function handleStartSession() {
    try {
      setLoading(true);
      setError("");

      const result =
        await createReceivingSession({
          reference:
            reference.trim() || undefined,

          notes:
            notes.trim() || undefined,
        });

      setSession(result.session);

      setProduct(null);
      setBarcode("");
      setQuantity("1");
      setActivity([]);

      clearUnknownBarcode();
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Unable to start receiving session.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await lookupBarcode(barcode);
  }

  async function handleCreateProduct(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!unknownBarcode) {
      return;
    }

    const productName =
      newProductName.trim();

    const brand =
      newBrand.trim();

    const caseCost =
      Number(newCaseCost);

    const sellingPrice =
      Number(newSellingPrice);

    const reorderLevel =
      Number(newReorderLevel);

    if (!productName) {
      setError(
        "Product name is required.",
      );
      return;
    }

    if (!brand) {
      setError(
        "Brand is required.",
      );
      return;
    }

    if (
      !Number.isFinite(caseCost) ||
      caseCost < 0
    ) {
      setError(
        "Case cost must be zero or greater.",
      );
      return;
    }

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      setError(
        "Selling price must be zero or greater.",
      );
      return;
    }

    if (
      !Number.isInteger(reorderLevel) ||
      reorderLevel < 0
    ) {
      setError(
        "Reorder level must be a whole number zero or greater.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const barcodeToCreate =
        unknownBarcode;

      await createInventory({
        productName,
        brand,

        /*
         * Receiving must own the inventory
         * increase so that the receipt and
         * session audit trail remain correct.
         */
        quantityInStock: 0,

        reorderLevel,
        caseCost,
        sellingPrice,

        status: "active",

        barcode: barcodeToCreate,
        barcodeType:
          newBarcodeType,
      });

      setAddProductOpen(false);
      setUnknownBarcode("");

      setNewProductName("");
      setNewBrand("");
      setNewCaseCost("");
      setNewSellingPrice("");
      setNewReorderLevel("5");

      /*
       * Re-read through the barcode registry.
       * This verifies the product + registry
       * transaction succeeded and gives
       * Receiving the canonical backend item.
       */
      await lookupBarcode(
        barcodeToCreate,
        newBarcodeType,
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create inventory product.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReceive() {
    if (!session || !product) {
      return;
    }

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError(
        "Quantity must be a whole number greater than zero.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!receiveIdempotencyKeyRef.current) {
        receiveIdempotencyKeyRef.current =
          crypto.randomUUID();
      }

      const result =
        await receiveInventory(
          {
            sessionId:
              session.sessionId,

            barcode:
              barcode.trim(),

            quantityReceived:
              parsedQuantity,
          },
          receiveIdempotencyKeyRef.current,
        );

      setSession((current) =>
        current
          ? {
              ...current,

              receiptCount:
                current.receiptCount + 1,

              totalUnitsReceived:
                current.totalUnitsReceived +
                parsedQuantity,
            }
          : current,
      );

      setActivity((current) => [
        {
          receipt:
            result.receipt,

          productName:
            result.item.productName,
        },

        ...current,
      ]);

      setProduct(null);
      setBarcode("");
      setQuantity("1");

      clearUnknownBarcode();

      receiveIdempotencyKeyRef.current = null;
    } catch (receiveError) {
      setError(
        receiveError instanceof Error
          ? receiveError.message
          : "Unable to receive inventory.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSession() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result =
        await completeReceivingSession(
          session.sessionId,
        );

      setSession(result.session);
      setProduct(null);

      clearUnknownBarcode();
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Unable to complete receiving session.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNewSession() {
    closeCamera();

    receiveIdempotencyKeyRef.current = null;

    setSession(null);

    setReference("");
    setNotes("");

    setBarcode("");
    setQuantity("1");

    setProduct(null);
    setActivity([]);

    setError("");

    clearUnknownBarcode();
  }

  function handleScanAnother() {
    receiveIdempotencyKeyRef.current = null;

    setBarcode("");
    setProduct(null);
    setQuantity("1");
    setError("");

    clearUnknownBarcode();

    setCameraOpen(true);
  }

  function decreaseQuantity() {
    const current =
      Number(quantity);

    if (
      !Number.isFinite(current) ||
      current <= 1
    ) {
      setQuantity("1");
      return;
    }

    setQuantity(
      String(
        Math.floor(current) - 1,
      ),
    );
  }

  function increaseQuantity() {
    const current =
      Number(quantity);

    if (
      !Number.isFinite(current) ||
      current < 1
    ) {
      setQuantity("1");
      return;
    }

    setQuantity(
      String(
        Math.floor(current) + 1,
      ),
    );
  }

  const sessionOpen =
    session?.status === "OPEN";

  return (
    <section className="px-5 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[var(--dd-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="dd-accent-line" />

              <p className="dd-label text-[var(--dd-orange)]">
                Warehouse Operations
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--dd-text)] sm:text-3xl">
              Receive Inventory
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dd-text-secondary)]">
              Scan incoming products, record
              quantities, and update available
              inventory in real time.
            </p>
          </div>

          {session && (
            <div
              className={[
                "flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold",

                sessionOpen
                  ? "dd-status-open"
                  : "dd-status-completed",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",

                  sessionOpen
                    ? "bg-[var(--dd-success)]"
                    : "bg-[var(--dd-text-muted)]",
                ].join(" ")}
              />

              SESSION {session.status}
            </div>
          )}
        </div>

        {error && (
          <ErrorMessage
            title="Receiving action failed"
            message={error}
            className="mt-6"
          />
        )}

        {/* Start session */}
        {!session && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

            <div className="dd-panel p-5 sm:p-6">
              <p className="dd-label">
                New Session
              </p>

              <h3 className="mt-2 text-lg font-bold text-[var(--dd-text)]">
                Start Receiving Session
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--dd-text-secondary)]">
                Create an inbound receiving
                session before scanning products
                from this delivery.
              </p>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="receiving-reference"
                    className="dd-label"
                  >
                    Reference / PO
                  </label>

                  <input
                    id="receiving-reference"
                    value={reference}
                    onChange={(event) =>
                      setReference(
                        event.target.value,
                      )
                    }
                    placeholder="PO-1042"
                    className="dd-input mt-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="receiving-notes"
                    className="dd-label"
                  >
                    Notes
                  </label>

                  <input
                    id="receiving-notes"
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value,
                      )
                    }
                    placeholder="Optional receiving notes"
                    className="dd-input mt-2"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleStartSession()
                }
                disabled={loading}
                className="dd-button-primary mt-6 w-full px-5 py-3.5 text-sm disabled:opacity-50 sm:w-auto"
              >
                {loading
                  ? "Starting session..."
                  : "Start Receiving"}
              </button>
            </div>

            <aside className="dd-panel p-5">
              <p className="dd-label">
                Workflow
              </p>

              <div className="mt-5 space-y-5">
                {[
                  [
                    "01",
                    "Start session",
                    "Identify the inbound shipment.",
                  ],

                  [
                    "02",
                    "Scan products",
                    "Identify existing inventory or add a new product.",
                  ],

                  [
                    "03",
                    "Receive units",
                    "Record quantities as products arrive.",
                  ],

                  [
                    "04",
                    "Complete",
                    "Close the receiving session.",
                  ],
                ].map(
                  ([
                    number,
                    title,
                    description,
                  ]) => (
                    <div
                      key={number}
                      className="flex gap-4"
                    >
                      <span className="font-mono text-[10px] font-bold text-[var(--dd-orange)]">
                        {number}
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-[var(--dd-text)]">
                          {title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[var(--dd-text-muted)]">
                          {description}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </aside>
          </div>
        )}

        {session && (
          <>
            {/* Session metrics */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <div className="dd-panel p-4">
                <p className="dd-label">
                  Session
                </p>

                <p className="mt-3 break-all font-mono text-xs font-semibold text-[var(--dd-text-secondary)]">
                  {session.sessionId}
                </p>

                {session.reference && (
                  <p className="mt-2 text-sm font-semibold text-[var(--dd-text)]">
                    {session.reference}
                  </p>
                )}
              </div>

              <div className="dd-panel relative overflow-hidden p-4">
                <span className="absolute left-0 top-0 h-full w-[2px] bg-[var(--dd-blue)]" />

                <p className="dd-label">
                  Receipts
                </p>

                <p className="dd-data-value mt-3 text-3xl font-bold text-[var(--dd-text)]">
                  {session.receiptCount}
                </p>
              </div>

              <div className="dd-panel relative overflow-hidden p-4">
                <span className="absolute left-0 top-0 h-full w-[2px] bg-[var(--dd-orange)]" />

                <p className="dd-label">
                  Units Received
                </p>

                <p className="dd-data-value mt-3 text-3xl font-bold text-[var(--dd-text)]">
                  {
                    session.totalUnitsReceived
                  }
                </p>
              </div>
            </div>

            {sessionOpen && (
              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">

                {/* Scanner */}
                <div className="dd-panel overflow-hidden">
                  <div className="border-b border-[var(--dd-border)] px-5 py-4 sm:px-6">
                    <p className="dd-label">
                      Product Scanner
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-[var(--dd-text)]">
                      Scan Product Barcode
                    </h3>
                  </div>

                  <div className="p-5 sm:p-6">
                    <form
                      onSubmit={handleLookup}
                      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <input
                        value={barcode}
                        onChange={(event) => {
                          setBarcode(
                            event.target.value,
                          );

                          setProduct(null);

                          clearUnknownBarcode();
                        }}
                        inputMode="numeric"
                        placeholder="Scan or enter barcode"
                        className="dd-input min-h-[58px] font-mono text-base tracking-wider"
                      />

                      <button
                        type="submit"
                        disabled={loading}
                        className="dd-button-secondary min-h-[58px] px-6 text-sm disabled:opacity-50"
                      >
                        {loading
                          ? "Searching..."
                          : "Find Product"}
                      </button>
                    </form>

                    {!product &&
                      !unknownBarcode && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setCameraOpen(
                                true,
                              )
                            }
                            className="mt-3 w-full rounded-lg border border-[var(--dd-orange)] bg-[var(--dd-orange-soft)] px-5 py-4 text-sm font-bold text-orange-300"
                          >
                            Open Camera Scanner
                          </button>

                          <div className="mt-5 rounded-xl border border-dashed border-[var(--dd-border-strong)] bg-[var(--dd-bg)] px-5 py-8 text-center">
                            <p className="text-sm font-semibold text-[var(--dd-text)]">
                              Waiting for barcode
                            </p>

                            <p className="mt-1 text-xs text-[var(--dd-text-muted)]">
                              Camera scanner or
                              manual barcode entry
                            </p>
                          </div>
                        </>
                      )}

                    {/* Unknown barcode */}
                    {unknownBarcode &&
                      !addProductOpen && (
                        <div className="mt-5 rounded-xl border border-[var(--dd-orange)]/50 bg-[var(--dd-orange-soft)] p-5">
                          <p className="dd-label text-orange-300">
                            Barcode Detected
                          </p>

                          <p className="mt-3 break-all font-mono text-lg font-bold text-[var(--dd-text)]">
                            {unknownBarcode}
                          </p>

                          <p className="mt-1 font-mono text-xs text-[var(--dd-text-muted)]">
                            {
                              detectedBarcodeType
                            }
                          </p>

                          <h4 className="mt-5 text-lg font-bold text-[var(--dd-text)]">
                            Product not found
                          </h4>

                          <p className="mt-2 text-sm leading-6 text-[var(--dd-text-secondary)]">
                            This barcode is not yet
                            assigned to an inventory
                            product.
                          </p>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() =>
                                setAddProductOpen(
                                  true,
                                )
                              }
                              className="dd-button-primary px-5 py-3.5 text-sm"
                            >
                              Add New Product
                            </button>

                            <button
                              type="button"
                              onClick={
                                handleScanAnother
                              }
                              className="dd-button-secondary px-5 py-3.5 text-sm"
                            >
                              Scan Another
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Add product */}
                    {unknownBarcode &&
                      addProductOpen && (
                        <form
                          onSubmit={
                            handleCreateProduct
                          }
                          className="mt-5 overflow-hidden rounded-xl border border-[var(--dd-border-strong)] bg-[var(--dd-surface-raised)]"
                        >
                          <div className="border-b border-[var(--dd-border)] p-5">
                            <p className="dd-label text-[var(--dd-orange)]">
                              New Inventory Product
                            </p>

                            <h4 className="mt-2 text-lg font-bold text-[var(--dd-text)]">
                              Add Scanned Product
                            </h4>

                            <p className="mt-2 text-sm text-[var(--dd-text-secondary)]">
                              The scanned barcode
                              will be registered to
                              this product.
                            </p>
                          </div>

                          <div className="grid gap-5 p-5 sm:grid-cols-2">

                            <div className="sm:col-span-2">
                              <label className="dd-label">
                                Barcode
                              </label>

                              <input
                                value={
                                  unknownBarcode
                                }
                                readOnly
                                className="dd-input mt-2 font-mono opacity-80"
                              />
                            </div>

                            <div>
                              <label className="dd-label">
                                Barcode Type
                              </label>

                              <select
                                value={
                                  newBarcodeType
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNewBarcodeType(
                                    event.target
                                      .value as BarcodeType,
                                  )
                                }
                                className="dd-input mt-2"
                              >
                                {barcodeTypeOptions.map(
                                  (type) => (
                                    <option
                                      key={
                                        type
                                      }
                                      value={
                                        type
                                      }
                                    >
                                      {type}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="dd-label">
                                Product Name
                              </label>

                              <input
                                value={
                                  newProductName
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNewProductName(
                                    event.target
                                      .value,
                                  )
                                }
                                placeholder="Product name"
                                className="dd-input mt-2"
                                required
                              />
                            </div>

                            <div>
                              <label className="dd-label">
                                Brand
                              </label>

                              <input
                                value={
                                  newBrand
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNewBrand(
                                    event.target
                                      .value,
                                  )
                                }
                                placeholder="Brand"
                                className="dd-input mt-2"
                                required
                              />
                            </div>

                            <div>
                              <label className="dd-label">
                                Case Cost
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  newCaseCost
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNewCaseCost(
                                    event.target
                                      .value,
                                  )
                                }
                                placeholder="0.00"
                                className="dd-input mt-2"
                                required
                              />
                            </div>

                            <div>
                              <label className="dd-label">
                                Selling Price
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  newSellingPrice
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNewSellingPrice(
                                    event.target
                                      .value,
                                  )
                                }
                                placeholder="0.00"
                                className="dd-input mt-2"
                                required
                              />
                            </div>

                            <div>
                              <label className="dd-label">
                                Reorder Level
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  newReorderLevel
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNewReorderLevel(
                                    event.target
                                      .value,
                                  )
                                }
                                className="dd-input mt-2"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 border-t border-[var(--dd-border)] p-5 sm:flex-row">
                            <button
                              type="submit"
                              disabled={loading}
                              className="dd-button-primary px-5 py-3.5 text-sm disabled:opacity-50"
                            >
                              {loading
                                ? "Creating Product..."
                                : "Create Product"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAddProductOpen(
                                  false,
                                )
                              }
                              className="dd-button-secondary px-5 py-3.5 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                    {/* Known product */}
                    {product && (
                      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--dd-border-strong)] bg-[var(--dd-surface-raised)]">

                        <div className="border-b border-[var(--dd-border)] p-5">
                          <p className="dd-label text-green-300">
                            Product Detected
                          </p>

                          <h4 className="mt-3 text-xl font-bold text-[var(--dd-text)]">
                            {product.productName}
                          </h4>

                          <p className="mt-1 text-sm text-[var(--dd-text-secondary)]">
                            {product.brand ||
                              "Unbranded product"}
                          </p>

                          <div className="mt-4 flex items-end justify-between gap-4">
                            <p className="font-mono text-xs text-[var(--dd-text-muted)]">
                              {product.barcode ||
                                barcode}
                            </p>

                            <div className="text-right">
                              <p className="dd-label">
                                Current Stock
                              </p>

                              <p className="mt-1 text-2xl font-bold text-[var(--dd-blue)]">
                                {
                                  product.quantityInStock
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-5">
                          <p className="dd-label">
                            Quantity Received
                          </p>

                          <div className="mt-3 grid grid-cols-[56px_minmax(0,1fr)_56px] overflow-hidden rounded-lg border border-[var(--dd-border-strong)] bg-[var(--dd-bg)]">

                            <button
                              type="button"
                              onClick={
                                decreaseQuantity
                              }
                              className="border-r border-[var(--dd-border)] text-xl font-bold"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={
                                quantity
                              }
                              onChange={(
                                event,
                              ) =>
                                setQuantity(
                                  event.target
                                    .value,
                                )
                              }
                              className="min-w-0 border-0 bg-transparent px-3 py-4 text-center text-xl font-bold outline-none"
                            />

                            <button
                              type="button"
                              onClick={
                                increaseQuantity
                              }
                              className="border-l border-[var(--dd-border)] text-xl font-bold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void handleReceive()
                            }
                            disabled={loading}
                            className="dd-button-primary mt-4 w-full px-5 py-4 text-sm disabled:opacity-50"
                          >
                            {loading
                              ? "Receiving..."
                              : `Receive ${
                                  quantity ||
                                  "0"
                                } ${
                                  Number(
                                    quantity,
                                  ) === 1
                                    ? "Unit"
                                    : "Units"
                                }`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity */}
                <div className="dd-panel overflow-hidden">
                  <div className="border-b border-[var(--dd-border)] px-5 py-4">
                    <p className="dd-label">
                      Session Activity
                    </p>

                    <h3 className="mt-1 text-base font-bold">
                      Recent Receipts
                    </h3>
                  </div>

                  {activity.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-[var(--dd-text-muted)]">
                      No inventory received yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--dd-border)]">
                      {activity.map(
                        (item) => (
                          <div
                            key={
                              item.receipt
                                .receiptId
                            }
                            className="flex items-center justify-between gap-4 px-5 py-4"
                          >
                            <div>
                              <p className="text-sm font-semibold">
                                {
                                  item.productName
                                }
                              </p>

                              <p className="mt-1 font-mono text-[10px] text-[var(--dd-text-muted)]">
                                {
                                  item.receipt
                                    .barcode
                                }
                              </p>
                            </div>

                            <span className="font-bold text-green-300">
                              +
                              {
                                item.receipt
                                  .quantityReceived
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {sessionOpen && (
              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--dd-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Finished receiving this delivery?
                  </p>

                  <p className="mt-1 text-xs text-[var(--dd-text-muted)]">
                    Completing the session prevents
                    additional receipts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void handleCompleteSession()
                  }
                  disabled={loading}
                  className="dd-button-secondary px-5 py-3 text-sm"
                >
                  {loading
                    ? "Completing..."
                    : "Complete Session"}
                </button>
              </div>
            )}

            {session.status ===
              "COMPLETED" && (
              <div className="mt-6 rounded-xl border border-green-900/60 bg-[var(--dd-success-soft)] p-5">

                <p className="font-bold text-green-300">
                  Receiving session completed
                </p>

                <p className="mt-1 text-sm text-green-300/70">
                  This session is closed and cannot
                  receive additional inventory.
                </p>

                <button
                  type="button"
                  onClick={
                    handleNewSession
                  }
                  className="dd-button-primary mt-5 w-full px-5 py-3 text-sm sm:w-auto"
                >
                  Start New Receiving Session
                </button>
              </div>
            )}
          </>
        )}

        {/* Camera */}
        {cameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--dd-border-strong)] bg-[var(--dd-surface)]">

              <div className="flex items-center justify-between border-b border-[var(--dd-border)] px-5 py-4">
                <div>
                  <p className="dd-label text-[var(--dd-orange)]">
                    Camera Scanner
                  </p>

                  <h3 className="mt-1 font-bold">
                    Scan Product Barcode
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCamera
                  }
                  className="dd-button-secondary px-3 py-2 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-[3/4] w-full object-cover sm:aspect-video"
                />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-[82%] rounded-lg border-2 border-[var(--dd-orange)] shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
                </div>

                <div className="pointer-events-none absolute bottom-5 left-0 right-0 text-center">
                  <span className="rounded-md bg-black/70 px-3 py-2 text-xs font-semibold text-white">
                    Align entire barcode inside frame
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="border-t border-red-900/60 bg-[var(--dd-danger-soft)] p-4">
                  <p className="text-sm font-semibold text-red-300">
                    Camera unavailable
                  </p>

                  <p className="mt-1 text-xs text-red-300/70">
                    {cameraError}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
