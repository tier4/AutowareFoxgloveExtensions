import { Header } from "./Header";
import { DetectedObject } from "./DetectedObjects";
import { Feature } from "./Feature";

export type DetectedObjectsWithFeature = {
    header: Header;
    feature_objects: DetectedObjectWithFeature[];
}

export type DetectedObjectWithFeature = {
    object: DetectedObject;
    feature: Feature;
}