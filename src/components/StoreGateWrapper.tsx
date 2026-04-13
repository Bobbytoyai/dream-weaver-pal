import BobbyStore from "@/components/BobbyStore";

interface StoreGateWrapperProps {
  childName: string;
  childAge: number;
}

/**
 * Store is now always accessible — no auth gate.
 * Auth is only required at install time (handled inside BobbyStore/contentInstaller).
 */
export default function StoreGateWrapper({ childName, childAge }: StoreGateWrapperProps) {
  return <BobbyStore childName={childName} childAge={childAge} />;
}
