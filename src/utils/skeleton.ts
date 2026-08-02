export interface Bone {
    id: string; // Unique identifier for the bone instance
    spriteName: string; // The image file to render
    parentId: string | null; // ID of the parent bone
    offsetX: number; // Pivot offset relative to parent's origin
    offsetY: number;
    pivotX?: number; // Pivot point inside the image (0 = center, positive = move image left relative to pivot)
    pivotY?: number;
    rotation: number; // Rotation in radians
    zIndex: number; // Draw order
    flipX?: boolean; // Flip horizontally if it's a left/right variant
    isAnimated?: boolean; // If true, can be affected by animation loop
}

export interface SkeletonPose {
    name: string;
    bones: Record<string, Partial<Bone>>; // Overrides for rotation and offsets per pose
}

export const defaultSkeleton: Bone[] = [
    { id: "tail", spriteName: "experimentTail.png", parentId: "downTorso", offsetX: -1, offsetY: 3, rotation: 0, zIndex: 0, isAnimated: true },
    
    { id: "backThigh", spriteName: "experimentThigh.png", parentId: "downTorso", offsetX: -1, offsetY: 4, pivotY: -4, rotation: 0, zIndex: 1, isAnimated: true },
    { id: "backCrus", spriteName: "experimentCrus.png", parentId: "backThigh", offsetX: 1, offsetY: 8, pivotY: -4, rotation: 0, zIndex: 0.5, isAnimated: true },
    { id: "backFoot", spriteName: "experimentFoot.png", parentId: "backCrus", offsetX: 0, offsetY: 8, pivotX: 0, pivotY: -6, rotation: 0, zIndex: 0, isAnimated: true },
    
    { id: "backUpArm", spriteName: "experimentUpArm.png", parentId: "upTorso", offsetX: -1, offsetY: -4, pivotY: -4, rotation: 0, zIndex: 2, isAnimated: true },
    { id: "backDownArm", spriteName: "experimentDownArm.png", parentId: "backUpArm", offsetX: 0, offsetY: 10, pivotY: -4, rotation: 0, zIndex: 2, isAnimated: true },
    { id: "handB", spriteName: "experimentHandB.png", parentId: "backDownArm", offsetX: 0, offsetY: 7, rotation: 0, zIndex: 2 },
    
    { id: "downTorso", spriteName: "experimentDownTorso.png", parentId: null, offsetX: 0, offsetY: 0, rotation: 0, zIndex: 3, isAnimated: true },
    { id: "upTorso", spriteName: "experimentUpTorso.png", parentId: "downTorso", offsetX: 0, offsetY: -4, pivotX: 0, pivotY: 4, rotation: 0, zIndex: 4, isAnimated: true },
    
    { id: "head", spriteName: "experimentHead.png", parentId: "upTorso", offsetX: 0, offsetY: -8, pivotX: 0, pivotY: 6, rotation: 0, zIndex: 5, isAnimated: true },
    { id: "eye", spriteName: "experimentEyeOpen.png", parentId: "head", offsetX: 0, offsetY: -6, rotation: 0, zIndex: 6 },
    
    { id: "frontThigh", spriteName: "experimentThigh.png", parentId: "downTorso", offsetX: -1, offsetY: 4, pivotY: -4, rotation: 0, zIndex: 7, isAnimated: true },
    { id: "frontCrus", spriteName: "experimentCrus.png", parentId: "frontThigh", offsetX: 1, offsetY: 8, pivotY: -4, rotation: 0, zIndex: 6.5, isAnimated: true },
    { id: "frontFoot", spriteName: "experimentFoot.png", parentId: "frontCrus", offsetX: 0, offsetY: 8, pivotX: 0, pivotY: -6, rotation: 0, zIndex: 6, isAnimated: true },
    
    { id: "frontUpArm", spriteName: "experimentUpArm.png", parentId: "upTorso", offsetX: -1, offsetY: -4, pivotY: -4, rotation: 0, zIndex: 8, isAnimated: true },
    { id: "frontDownArm", spriteName: "experimentDownArm.png", parentId: "frontUpArm", offsetX: 0, offsetY: 10, pivotY: -4, rotation: 0, zIndex: 8, isAnimated: true },
    { id: "handF", spriteName: "experimentHandF.png", parentId: "frontDownArm", offsetX: 0, offsetY: 7, rotation: 0, zIndex: 8 },
];

export const poses: Record<string, SkeletonPose> = {
    standing: {
        name: "Standing",
        bones: {
            head: { rotation: -0.5 },
            downTorso: { rotation: 0.3 },
            upTorso: { rotation: 0.3 },
            tail: { rotation: -0.1 },
            
            frontThigh: { rotation: -0.3 },
            frontCrus: { rotation: 1.0 },
            frontFoot: { rotation: -1.8 },
            
            backThigh: { rotation: -0.3 },
            backCrus: { rotation: 1.0 },
            backFoot: { rotation: -1.8 },
            
            frontUpArm: { rotation: -0.3 },
            frontDownArm: { rotation: -0.2 },
            backUpArm: { rotation: -0.5 },
            backDownArm: { rotation: -0.2 },
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
                // if (bone.id === "upTorso") currentBone.offsetY += Math.sin(time * 2) * 1.5;
                if (bone.id === "head") currentBone.rotation += Math.sin(time * 2) * 0.05;
                if (bone.id === "frontUpArm" || bone.id === "backUpArm") currentBone.rotation += Math.cos(time * 2) * 0.05;
                
                // Subtle leg breathing
                if (bone.id === "frontThigh" || bone.id === "backThigh") currentBone.rotation += Math.sin(time * 2) * 0.02;
                if (bone.id === "frontCrus" || bone.id === "backCrus") currentBone.rotation -= Math.sin(time * 2) * 0.03;
                
                // Gentle tail wag
                if (bone.id === "tail") currentBone.rotation += Math.sin(time * 1.5) * 0.1;
                
            } else if (animation === 'walk') {
                const speed = 4;
                if (bone.id === "upTorso") {
                    // currentBone.offsetY += Math.abs(Math.sin(time * speed)) * 2;
                    currentBone.rotation += Math.sin(time * speed) * 0.1;
                }
                if (bone.id === "head") currentBone.rotation += Math.sin(time * speed) * 0.1;
                
                // Leg walk cycle maintaining the reverse-joint posture
                if (bone.id === "frontThigh") currentBone.rotation += Math.sin(time * speed) * 0.6;
                if (bone.id === "backThigh") currentBone.rotation += Math.sin(time * speed + Math.PI) * 0.6;
                
                // Knee bends maximally when leg is lifting (time * speed = PI)
                if (bone.id === "frontCrus") currentBone.rotation += -Math.cos(time * speed) * 0.8;
                if (bone.id === "backCrus") currentBone.rotation += -Math.cos(time * speed + Math.PI) * 0.8;
                
                // Foot compensates to point forward/down correctly during stride
                if (bone.id === "frontFoot") currentBone.rotation += Math.sin(time * speed) * 0.0;
                if (bone.id === "backFoot") currentBone.rotation += Math.sin(time * speed + Math.PI) * 0.0;
                
                // Opposite arm swing
                if (bone.id === "frontUpArm") currentBone.rotation += Math.sin(time * speed + Math.PI) * 1.0;
                if (bone.id === "backUpArm") currentBone.rotation += Math.sin(time * speed) * 1.0;
                if (bone.id === "frontDownArm" || bone.id === "backDownArm") currentBone.rotation += -0.5 + Math.cos(time * speed) * 0.3;
                
                // Tail balance wag
                if (bone.id === "tail") currentBone.rotation += Math.sin(time * speed) * 0.3;
            }
        }

        return currentBone;
    });
}
