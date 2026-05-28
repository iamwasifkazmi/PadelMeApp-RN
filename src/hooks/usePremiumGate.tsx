import React from "react";
import { PremiumComingSoonModal } from "../components/PremiumComingSoonModal";
import { PREMIUM_ENABLED } from "../config/features";

type GateOptions = {
  title?: string;
  feature?: string;
  description?: string;
};

type GateState = GateOptions | null;

/**
 * Hook that returns:
 *  - `gate(action, opts?)`: a wrapped onPress. When PREMIUM_ENABLED is false,
 *     opens an elegant "Premium coming soon" modal instead of running the action.
 *  - `openGate(opts?)`: imperatively show the modal.
 *  - `gateModal`: JSX you must render somewhere in your screen tree.
 *
 * Use everywhere a user could create / host a tournament or league.
 */
export function usePremiumGate() {
  const [state, setState] = React.useState<GateState>(null);

  const openGate = React.useCallback((opts?: GateOptions) => {
    setState(opts ?? {});
  }, []);

  const closeGate = React.useCallback(() => {
    setState(null);
  }, []);

  const gate = React.useCallback(
    (action: () => void, opts?: GateOptions) => {
      return () => {
        if (!PREMIUM_ENABLED) {
          setState(opts ?? {});
          return;
        }
        action();
      };
    },
    [],
  );

  const gateModal = (
    <PremiumComingSoonModal
      visible={state !== null}
      onClose={closeGate}
      title={state?.title}
      feature={state?.feature}
      description={state?.description}
    />
  );

  return { gate, openGate, closeGate, gateModal, isPremiumEnabled: PREMIUM_ENABLED };
}
