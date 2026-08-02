export interface Bone {
    id: string; // Unique identifier for the bone instance
    spriteName: string; // The image file to render
    parentId: string | null; // ID of the parent bone
    offsetX: number; // Pivot offset relative to parent's origin
    offsetY: number;
    rotation: number; // Rotation in radians
    zIndex: number; // Draw order
    flipX?: boolean; // Flip horizontally if it's a left/right variant
    isAnimated?: boolean; // If true, can be affected by animation loop
}

export interface SkeletonPose {
    name: string;
    bones: Record<string, Partial<Bone>>; // Overrides for rotation and offsets per pose
}

// Default standing pose skeleton definition
export const defaultSkeleton: Bone[] = [
    { id: "tail", spriteName: "experimentTail.png", parentId: "downTorso", offsetX: 0, offsetY: 15, rotation: 0, zIndex: 0 },
    
    { id: "backThigh", spriteName: "experimentThigh.png", parentId: "downTorso", offsetX: 5, offsetY: 5, rotation: 0, zIndex: 1, isAnimated: true },
    { id: "backCrus", spriteName: "experimentCrus.png", parentId: "backThigh", offsetX: 0, offsetY: 10, rotation: 0, zIndex: 1, isAnimated: true },
    { id: "backFoot", spriteName: "experimentFoot.png", parentId: "backCrus", offsetX: 0, offsetY: 10, rotation: 0, zIndex: 1 },
    
    { id: "backUpArm", spriteName: "experimentUpArm.png", parentId: "upTorso", offsetX: 6, offsetY: 0, rotation: 0, zIndex: 2, isAnimated: true },
    { id: "backDownArm", spriteName: "experimentDownArm.png", parentId: "backUpArm", offsetX: 0, offsetY: 12, rotation: 0, zIndex: 2, isAnimated: true },
    { id: "handB", spriteName: "experimentHandB.png", parentId: "backDownArm", offsetX: 0, offsetY: 12, rotation: 0, zIndex: 2 },
    
    { id: "downTorso", spriteName: "experimentDownTorso.png", parentId: null, offsetX: 0, offsetY: 0, rotation: 0, zIndex: 3 },
    { id: "upTorso", spriteName: "experimentUpTorso.png", parentId: "downTorso", offsetX: 0, offsetY: -12, rotation: 0, zIndex: 4, isAnimated: true },
    
    { id: "head", spriteName: "experimentHead.png", parentId: "upTorso", offsetX: 0, offsetY: -10, rotation: 0, zIndex: 5, isAnimated: true },
    { id: "face", spriteName: "experimentEyeOpen.png", parentId: "head", offsetX: -2, offsetY: 2, rotation: 0, zIndex: 6 },
    
    { id: "frontThigh", spriteName: "experimentThigh.png", parentId: "downTorso", offsetX: -5, offsetY: 5, rotation: 0, zIndex: 7, isAnimated: true },
    { id: "frontCrus", spriteName: "experimentCrus.png", parentId: "frontThigh", offsetX: 0, offsetY: 10, rotation: 0, zIndex: 7, isAnimated: true },
    { id: "frontFoot", spriteName: "experimentFoot.png", parentId: "frontCrus", offsetX: 0, offsetY: 10, rotation: 0, zIndex: 7 },
    
    { id: "frontUpArm", spriteName: "experimentUpArm.png", parentId: "upTorso", offsetX: -6, offsetY: 0, rotation: 0, zIndex: 8, isAnimated: true },
    { id: "frontDownArm", spriteName: "experimentDownArm.png", parentId: "frontUpArm", offsetX: 0, offsetY: 12, rotation: 0, zIndex: 8, isAnimated: true },
    { id: "handF", spriteName: "experimentHandF.png", parentId: "frontDownArm", offsetX: 0, offsetY: 12, rotation: 0, zIndex: 8 },
];

export const poses: Record<string, SkeletonPose> = {
    standing: {
        name: "Standing",
        bones: {
            frontThigh: { rotation: -0.2 },
            backThigh: { rotation: 0.2 },
            frontUpArm: { rotation: 0.2 },
            backUpArm: { rotation: -0.2 },
        }
    },
    sitting: {
        name: "Sitting",
        bones: {
            downTorso: { offsetY: 10, rotation: 0.3 },
            upTorso: { rotation: 0.2 },
            head: { rotation: -0.2 },
            frontThigh: { rotation: -1.0 },
            frontCrus: { rotation: 1.5 },
            backThigh: { rotation: -0.8 },
            backCrus: { rotation: 1.2 },
            frontUpArm: { rotation: 0.5 },
            backUpArm: { rotation: 0.4 },
        }
    }
};

export type AnimationType = 'none' | 'idle' | 'walk';

export function calculateAnimatedSkeleton(
    skeleton: Bone[], 
    pose: SkeletonPose, 
    animation: AnimationType, 
    time: number
): Bone[] {
    return skeleton.map(bone => {
        let currentBone = { ...bone };
        
        // Apply pose overrides
        const poseOverride = pose.bones[bone.id];
        if (poseOverride) {
            if (poseOverride.rotation !== undefined) currentBone.rotation = poseOverride.rotation;
            if (poseOverride.offsetX !== undefined) currentBone.offsetX = poseOverride.offsetX;
            if (poseOverride.offsetY !== undefined) currentBone.offsetY = poseOverride.offsetY;
        }

        // Apply animation logic if applicable
        if (currentBone.isAnimated) {
            if (animation === 'idle') {
                if (bone.id === "upTorso") currentBone.offsetY += Math.sin(time * 2) * 1.5;
                if (bone.id === "head") currentBone.rotation += Math.sin(time * 2) * 0.05;
                if (bone.id === "frontUpArm" || bone.id === "backUpArm") currentBone.rotation += Math.cos(time * 2) * 0.05;
            } else if (animation === 'walk') {
                const speed = 5;
                if (bone.id === "upTorso") currentBone.offsetY += Math.abs(Math.sin(time * speed)) * 2;
                if (bone.id === "frontThigh") currentBone.rotation += Math.sin(time * speed) * 0.8;
                if (bone.id === "backThigh") currentBone.rotation += Math.sin(time * speed + Math.PI) * 0.8;
                if (bone.id === "frontCrus" || bone.id === "backCrus") currentBone.rotation = 0.2 + Math.sin(time * speed) * 0.2;
                
                // Opposite arm swing
                if (bone.id === "frontUpArm") currentBone.rotation += Math.sin(time * speed + Math.PI) * 0.6;
                if (bone.id === "backUpArm") currentBone.rotation += Math.sin(time * speed) * 0.6;
            }
        }

        return currentBone;
    });
}
