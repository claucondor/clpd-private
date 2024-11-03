"use client";
// react
import { useState } from "react";

// next
import Image from "next/image";

// componentes
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CLPFlag from "../CLPFlag";

// translations
import { useTranslations } from "next-intl";

// utils
import { cn } from "@/lib/utils";
import { web3AuthInstance } from "@/provider/WagmiConfig";

// http client
import axios from "axios";

// ui
import { LoadingSpinner } from "../ui/spinner";

// context
import { useUserStore } from "@/context/global-store";

// crypto
import { useCLPDBalance } from "@/hooks/useCLPDBalance";
import crypto from "crypto";
import { baseSepolia, sapphireTestnet } from "viem/chains";
import { useAccount } from "wagmi";
import { LucideArrowLeft } from "lucide-react";

interface CreateStepsProps {
  t: (key: string) => string;
  amount: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleBack: () => void;
  errorFields: string[];
  handleMaxAmount: () => void;
  handleChangeField: (field: string, value: string | boolean) => void;
  clpdBalanceFormatted: string;
  clpdBalanceFormattedOasis: string;
  status: "pending" | "success";
  networkIn: "baseSepolia" | "sapphireTestnet";
  networkOut: "baseSepolia" | "sapphireTestnet";
  handleChangeNetwork: (network: string) => void;
}

const formIds = {
  bridge: "bridge",
};

const titles = (status: "pending" | "success", networkIn?: string) => ({
  0: networkIn === "baseSepolia" ? "createBridgeOrderOasis" : "createBridgeOrderBase",
  1: status === "success" ? "bridgeSuccess" : "bridgePending",
});

const createSteps = ({
  t,
  amount,
  handleAmountChange,
  handleSubmit,
  networkIn,
  handleBack,
  errorFields,
  handleMaxAmount,
  handleChangeField,
  clpdBalanceFormatted,
  clpdBalanceFormattedOasis,
  status,
  handleChangeNetwork,
  networkOut,
}: CreateStepsProps) => [
  {
    step: 0,
    title: networkIn === "baseSepolia" ? t("createBridgeOrderBase") : t("createBridgeOrderOasis"),
    children: (
      <form id={formIds.bridge} onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex max-md:flex-col md:items-center justify-between gap-2">
          <p className={cn("text-base text-black/50 font-helvetica text-start")}>
            {t("availableBalance")} {networkIn === "baseSepolia" ? "Base" : "Oasis"}:{" "}
            <span className="font-bold">
              {networkIn === "baseSepolia" ? clpdBalanceFormatted : clpdBalanceFormattedOasis}
            </span>{" "}
            CLPD
          </p>

          <div
            className={cn(
              "flex items-center gap-2 group relative md:mr-6 max-md:w-max max-md:mx-auto transition-all duration-300",
              networkIn !== "baseSepolia" && "flex-row-reverse"
            )}
          >
            <Image
              src="/images/app/base-logo.svg"
              alt="base"
              width={22}
              height={22}
              className={cn(
                "rounded-full overflow-hidden object-cover md:absolute group-hover:translate-x-0 transition-all duration-300",
                networkIn === "baseSepolia"
                  ? "left-[calc(50%-38px)] group-hover:-left-7"
                  : "right-[calc(50%-40px)] group-hover:-right-7"
              )}
            />
            <p className="text-sm font-helvetica md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Base
            </p>
            <Button
              type="button"
              onClick={() => {
                if (networkIn === "baseSepolia") {
                  handleChangeNetwork("sapphireTestnet");
                } else {
                  handleChangeNetwork("baseSepolia");
                }
              }}
              className="h-auto ml-auto border rounded-full p-1 text-sm font-bold hover:bg-black/5 transition-colors"
            >
              <Image src="/images/app/arrow-switch.svg" alt="arrow-switch" width={12} height={12} />
            </Button>
            <p className="text-sm font-helvetica md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Oasis
            </p>
            <Image
              src="/images/app/oasis-logo.svg"
              alt="oasis"
              width={22}
              height={22}
              className={cn(
                "rounded-full overflow-hidden object-cover md:absolute group-hover:translate-x-0 transition-all duration-300",
                networkIn === "baseSepolia"
                  ? "right-[calc(50%-36px)] group-hover:-right-7"
                  : "left-[calc(50%-38px)] group-hover:-left-7"
              )}
            />
          </div>
        </div>
        <div
          className={cn(
            "grid w-full items-center gap-1.5 bg-gray-100 rounded-md p-3 border-2 border-black shadow-brutalist-sm relative transition-all duration-300 h-auto",
            errorFields.includes("amount") && "bg-red-100"
          )}
        >
          <label htmlFor="amount" className="font-bold text-base">
            {t("send")}
          </label>

          <div className="flex items-center gap-4 relative">
            <Input
              type="number"
              id="amount"
              placeholder={t("amountPlaceholder")}
              value={amount}
              onChange={handleAmountChange}
              className="bg-transparent text-black text-[32px] font-helvetica border-none p-0 focus:outline-none"
            />
            <div className="absolute bottom-0 right-0 flex items-end gap-2">
              <button
                type="button"
                onClick={handleMaxAmount}
                className="bg-white border-2 border-black rounded-full p-1 text-sm font-bold hover:bg-black/5 transition-colors"
              >
                {t("max")}
              </button>
              <CLPFlag type="CLPD" />
            </div>
          </div>
          {errorFields.includes("amount") && (
            <p className="text-red-500 text-sm">{t("errorFields.amount")}</p>
          )}
        </div>

        <Image
          src="/images/app/arrow-down.svg"
          alt="arrow-down"
          width={32}
          height={32}
          className="mx-auto"
        />

        <div className="grid w-full items-center gap-1.5 bg-gray-100 rounded-md p-3 border-2 border-black shadow-brutalist-sm">
          <label htmlFor="amount" className="font-bold text-base">
            {t("receive")}
          </label>
          <div className="flex items-center justify-between gap-4 relative max-md:w-[270px] md:w-full">
            <p className="bg-transparent text-black text-[32px] font-helvetica border-none focus:outline-none line-clamp-1">
              {amount || "0"}
            </p>

            <div>
              <CLPFlag type="CLPD" />
            </div>
          </div>
        </div>
      </form>
    ),
    formId: formIds.bridge,
    status,
  },
  {
    step: 1,
    title: status === "success" ? t("bridgeSuccess") : t("bridgePending"),
    children: (
      <div className="flex flex-col items-start justify-center gap-2">
        <Image
          src={status === "success" ? "/images/app/success-gif.gif" : "/images/app/wired-gif.gif"}
          alt="done"
          width={200}
          height={200}
          className="mx-auto"
          unoptimized
        />
        <p
          className={cn(
            "text-xl font-helvetica font-light text-start text-white",
            status === "success" && "font-bold text-black"
          )}
        >
          {status === "success"
            ? t("stepSuccessBridgeDescription")
            : t("stepPendingBridgeDescription")}
        </p>
        <p
          className={cn(
            "text-xl font-helvetica font-light text-start text-white",
            status === "success" && "font-bold text-black"
          )}
        >
          {status === "success" &&
            `You have successfully bridged ${amount} CLPD to ${
              networkIn === "baseSepolia" ? "Oasis" : "Base"
            }`}
        </p>
        <p
          className={cn(
            "text-xl font-helvetica font-light text-start text-white",
            status === "success" && "font-bold text-black"
          )}
        >
          New Balance:
          <br />
          Base: {clpdBalanceFormatted}
          <br />
          Oasis: {clpdBalanceFormattedOasis}
        </p>
      </div>
    ),
  },
];

const Bridge: React.FC = () => {
  const t = useTranslations("bridge");
  const [bridgeAmount, setBridgeAmount] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [networkIn, setNetworkIn] = useState<"baseSepolia" | "sapphireTestnet">("baseSepolia");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorFields, setErrorFields] = useState<string[]>([]);

  const { user } = useUserStore();

  const { address: userAddress } = useAccount();
  const { clpdBalanceFormatted, refetch: refetchCLPDBalance } = useCLPDBalance({
    address: userAddress,
    chainId: baseSepolia.id,
    _chainName: "baseSepolia",
  });
  const { clpdBalanceFormatted: clpdBalanceFormattedOasis, refetch: refetchCLPDBalanceOasis } =
    useCLPDBalance({
      address: userAddress,
      chainId: sapphireTestnet.id,
      _chainName: "sapphireTestnet",
    });

  const [status, setStatus] = useState<"pending" | "success">("pending");

  const [loadingGetCLPDTesnet, setLoadingGetCLPDTesnet] = useState<boolean>(false);

  console.log("clpdBalanceFormatted", clpdBalanceFormatted);

  const handleGetCLPDTesnet = async () => {
    setLoadingGetCLPDTesnet(true);
    try {
      const userInfo = await web3AuthInstance.getUserInfo();
      const idToken = userInfo?.idToken;
      const response = await axios.post(
        "/api/bridge/get-clpd-testnet",
        {
          userAddress,
          networkIn: "baseSepolia",
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      console.log(response.data);
      if (response.status === 200) {
        refetchCLPDBalance();
        refetchCLPDBalanceOasis();
      }
    } catch (error) {
      console.error("Error al obtener CLPD de testnet:", error);
    } finally {
      setLoadingGetCLPDTesnet(false);
    }
  };

  const handleMaxAmount = () => {
    setBridgeAmount(networkIn === "baseSepolia" ? clpdBalanceFormatted : clpdBalanceFormattedOasis);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    value = value.replace(/[^0-9]/g, "");

    if (value.length > 1 && value.startsWith("0")) {
      value = value.replace(/^0+/, "");
    }

    const numValue = parseInt(value);
    if (numValue > 10000000) {
      value = "10000000";
    }

    setBridgeAmount(value);
    // if (
    //   Number(value) >
    //   Number(networkIn === "baseSepolia" ? clpdBalanceFormatted : clpdBalanceFormattedOasis)
    // ) {
    //   setErrorFields((prev) => [...prev, "amount"]);
    // } else {
    //   setErrorFields((prev) => prev.filter((field) => field !== "amount"));
    // }
  };

  const handleBack = () => {
    setStatus("pending");
    setCurrentStep(currentStep - 1);
  };

  const handleChangeField = (field: string, value: string | boolean) => {
    setErrorFields((prev) => prev.filter((f) => f !== field));
    switch (field) {
      case "amount":
        setBridgeAmount(value as string);
        break;
      default:
        break;
    }
  };

  const handleTransfer = async () => {
    setLoading(true);
    try {
      setCurrentStep(1);
      const userInfo = await web3AuthInstance.getUserInfo();
      const idToken = userInfo?.idToken;
      const privateKey = (await web3AuthInstance.provider?.request({
        method: "private_key",
      })) as string;

      // Encriptar la clave privada antes de enviarla
      const encryptionKey = crypto.randomBytes(32).toString("hex");
      const iv = crypto.randomBytes(16).toString("hex");
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(encryptionKey, "hex"),
        Buffer.from(iv, "hex")
      );
      let encryptedPKey = cipher.update(privateKey, "utf8", "hex");
      encryptedPKey += cipher.final("hex");

      // if (!userAddress || !networkIn || !networkOut || !amount || !idToken || !encryptedPKey) {
      const response = await axios.post(
        "/api/bridge",
        {
          userAddress,
          networkIn,
          networkOut: networkIn === "baseSepolia" ? "sapphireTestnet" : "baseSepolia",
          amount: bridgeAmount,
          encryptedPKey,
          iv,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "X-Encryption-Key": encryptionKey,
          },
        }
      );

      if (response.status === 200) {
        // Manejar respuesta exitosa
        console.log("Transferencia iniciada:", response.data);
        setStatus("success");
        refetchCLPDBalance();
        // Actualizar el estado o navegar a la siguiente pantalla
      }
    } catch (error) {
      console.error("Error al iniciar la transferencia:", error);
      // Manejar el error (mostrar mensaje al usuario, etc.)
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    handleTransfer();
  };

  const handleChangeNetwork = (network: string) => {
    setBridgeAmount("0");
    setNetworkIn(network as "baseSepolia" | "sapphireTestnet");
    if (network === "sapphireTestnet") {
      refetchCLPDBalanceOasis();
    } else {
      refetchCLPDBalance();
    }
  };

  return (
    <Card
      className={cn(
        "w-full max-w-xl bg-white border-2 border-black rounded-xl shadow-brutalist max-md:w-[90%] mx-auto md:my-10 md:mb-20 relative",
        currentStep === 1 && status === "success" && "bg-brand-green-pastel",
        currentStep === 1 && status === "pending" && "bg-brand-blue"
      )}
    >
      <CardContent
        className={cn(
          "space-y-4 text-black pt-6 transition-all duration-200",
          currentStep === 1 && status === "success" && "text-black",
          currentStep === 1 && status === "pending" && "text-white"
        )}
      >
        <div className="flex flex-col rounded-xl border-none gap-3">
          <div className={cn("flex items-center justify-between gap-2.5")}>
            {currentStep === 1 && status === "success" && (
              <LucideArrowLeft
                className="w-10 h-10 cursor-pointer border-2 border-black rounded-full p-2"
                onClick={handleBack}
              />
            )}

            <h3
              className={cn(
                "text-xl font-helvetica font-bold",
                currentStep === 1 && status === "success" && "text-black",
                currentStep === 1 && status === "pending" && "text-white"
              )}
            >
              {t(Object.values(titles(status, networkIn))[currentStep])}
            </h3>

            {/* Get CLPD Testnet */}
            {currentStep === 0 && (
              <Button
                onClick={handleGetCLPDTesnet}
                className="bg-brand-yellow-pastel border-2 border-black shadow-brutalist-sm text-black font-helvetica font-bold transition-all duration-200"
              >
                {loadingGetCLPDTesnet ? <LoadingSpinner /> : t("getCLPDTesnet")}
              </Button>
            )}
          </div>
          {
            createSteps({
              t,
              amount: bridgeAmount,
              handleAmountChange,
              handleSubmit,
              handleBack,
              errorFields,
              handleMaxAmount,
              handleChangeField,
              clpdBalanceFormatted,
              status,
              networkIn,
              networkOut: networkIn === "baseSepolia" ? "sapphireTestnet" : "baseSepolia",
              handleChangeNetwork,
              clpdBalanceFormattedOasis,
            })[currentStep].children
          }
        </div>
      </CardContent>
      {currentStep !== 1 && (
        <CardFooter>
          <Button
            className="w-full bg-brand-blue-dark border-2 border-black shadow-brutalist-sm py-4 h-full text-xl hover:bg-brand-blue-dark/90 text-white font-helvetica font-bold"
            type="submit"
            form={formIds.bridge}
            disabled={errorFields.length > 0}
          >
            {!loading ? (
              (() => {
                switch (currentStep) {
                  case 0:
                    return t("bridge");
                  case 1:
                    return t("submit");
                }
              })()
            ) : (
              <LoadingSpinner />
            )}
          </Button>
        </CardFooter>
      )}

      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex justify-center my-2 space-x-2 bg-white w-full max-w-3xl rounded-full">
        {Object.keys(titles(status)).map((s) => (
          <div
            key={s}
            className={cn(
              "w-full h-2 rounded-full",
              parseInt(s) === currentStep && status !== "success"
                ? "bg-black"
                : status === "success"
                ? "bg-brand-green-pastel"
                : "bg-black/30"
            )}
          />
        ))}
      </div>
    </Card>
  );
};

export default Bridge;
