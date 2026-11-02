import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { CheeseShort, CHEESE_FRAMES } from "./videos/cheese/Cheese";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CheeseShort"
        component={CheeseShort}
        durationInFrames={CHEESE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BridgeShort"
        component={BridgeShort}
        durationInFrames={BRIDGE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
