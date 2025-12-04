import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (value: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export const EditModeProvider = ({ children }: { children: ReactNode }) => {
  const [isEditMode, setIsEditMode] = useState(() => {
    const stored = localStorage.getItem("editMode");
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem("editMode", String(isEditMode));
  }, [isEditMode]);

  const toggleEditMode = () => setIsEditMode((prev) => !prev);
  const setEditMode = (value: boolean) => setIsEditMode(value);

  return (
    <EditModeContext.Provider value={{ isEditMode, toggleEditMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
};
