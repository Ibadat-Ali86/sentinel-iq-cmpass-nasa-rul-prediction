"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { EngineUnit } from "@/types/sentineliq";

interface InferenceContextProps {
  uploadedDataset: string | null;
  uploadedUnits: EngineUnit[] | null;
  setUploadedData: (fileName: string | null, units: EngineUnit[] | null) => void;
  clearUploadedData: () => void;
}

const InferenceContext = createContext<InferenceContextProps | undefined>(undefined);

export function InferenceProvider({ children }: { children: ReactNode }) {
  const [uploadedDataset, setUploadedDataset] = useState<string | null>(null);
  const [uploadedUnits, setUploadedUnits] = useState<EngineUnit[] | null>(null);

  const setUploadedData = (fileName: string | null, units: EngineUnit[] | null) => {
    setUploadedDataset(fileName);
    setUploadedUnits(units);
  };

  const clearUploadedData = () => {
    setUploadedDataset(null);
    setUploadedUnits(null);
  };

  return (
    <InferenceContext.Provider value={{ uploadedDataset, uploadedUnits, setUploadedData, clearUploadedData }}>
      {children}
    </InferenceContext.Provider>
  );
}

export function useInferenceContext() {
  const context = useContext(InferenceContext);
  if (context === undefined) {
    throw new Error("useInferenceContext must be used within an InferenceProvider");
  }
  return context;
}
