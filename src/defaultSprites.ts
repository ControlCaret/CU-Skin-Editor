export interface SpriteConfig {
    name: string;
    category: string;
    [key: string]: any; // Allow arbitrary metadata
}

export const defaultSprites: SpriteConfig[] = [
    { name: "experimentCrus.png", category: "Body" },
    { name: "experimentDownArm.png", category: "Body" },
    { name: "experimentDownTorso.png", category: "Body" },
    { name: "experimentEyeClosed.png", category: "Head" },
    { name: "experimentEyeGone.png", category: "Head" },
    { name: "experimentEyeGoneHealed.png", category: "Head" },
    { name: "experimentEyeHalfClosed.png", category: "Head" },
    { name: "experimentEyeHalfClosedBack.png", category: "Head" },
    { name: "experimentEyeHappy.png", category: "Head" },
    { name: "experimentEyeLookBack.png", category: "Head" },
    { name: "experimentEyeOpen.png", category: "Head" },
    { name: "experimentEyePanic.png", category: "Head" },
    { name: "experimentEyeSad.png", category: "Head" },
    { name: "experimentEyeSadBack.png", category: "Head" },
    { name: "experimentEyeScared.png", category: "Head" },
    { name: "experimentEyeScaredBack.png", category: "Head" },
    { name: "experimentFoot.png", category: "Body" },
    { name: "experimentHandB.png", category: "Body" },
    { name: "experimentHandF.png", category: "Body" },
    { name: "experimentHead.png", category: "Head" },
    { name: "experimentHeadBack.png", category: "Head" },
    { name: "experimentHeadBackMouth.png", category: "Head" },
    { name: "experimentHeadBackMouthMini.png", category: "Head" },
    { name: "experimentHeadDisfigured1.png", category: "Head" },
    { name: "experimentHeadDisfigured1Healed.png", category: "Head" },
    { name: "experimentHeadDisfigured2.png", category: "Head", unused: true },
    { name: "experimentHeadDisfigured2Healed.png", category: "Head", unused: true },
    { name: "experimentHeadDisfigured3.png", category: "Head", unused: true },
    { name: "experimentHeadDisfigured3Healed.png", category: "Head", unused: true },
    { name: "experimentNosebleed.png", category: "Head" },
    { name: "experimentTail.png", category: "Body" },
    { name: "experimentThigh.png", category: "Body" },
    { name: "experimentUpArm.png", category: "Body" },
    { name: "experimentUpTorso.png", category: "Body" }
];
