import { Alert, Platform } from "react-native";
import { useToastStore } from "@/lib/stores/toast-store";

export interface AlertOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export function showAlert({ title, description, variant = "default" }: AlertOptions) {
  // Use toast notifications instead of native alerts
  const toastStore = useToastStore.getState();
  
  switch (variant) {
    case "success":
      toastStore.showSuccess(title, description);
      break;
    case "destructive":
      toastStore.showError(title, description);
      break;
    default:
      toastStore.showInfo(title, description);
      break;
  }
}

export function showSuccessAlert(title: string, description?: string) {
  useToastStore.getState().showSuccess(title, description);
}

export function showErrorAlert(title: string, description?: string) {
  useToastStore.getState().showError(title, description);
}

// Legacy function for cases where native alert is truly needed
export function showNativeAlert(title: string, description?: string, onOk?: () => void) {
  if (Platform.OS === "web") {
    const message = description ? `${title}\n${description}` : title;
    alert(message);
    onOk?.();
  } else {
    Alert.alert(
      title,
      description,
      [
        {
          text: "OK",
          onPress: onOk,
        },
      ]
    );
  }
}