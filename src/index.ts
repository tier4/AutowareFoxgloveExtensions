import { CubePrimitive, SceneUpdate, SpherePrimitive, ImageAnnotations, PointsAnnotation, PointsAnnotationType, TextAnnotation } from "@foxglove/schemas";
import { Header } from "./Header";
import { Position } from "./Position";
import { Orientation } from "./Orientation";
import { PredictedObjects } from "./PredictedObjects";
import { TrackedObjects } from "./TrackedObjects";
import { DetectedObjects } from "./DetectedObjects";
import { DetectedObjectsWithFeature } from "./DetectedObjectsWithFeature";
import { TrafficLightRoiArray } from "./TrafficLightRoi";
import { ExtensionContext } from "@foxglove/studio";

type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const colorMap: Record<number, Color> = {
  0: { r: 1.0, g: 1.0, b: 1.0, a: 0.5 }, // UNKNOWN // white // hex: #FFFFFF
  1: { r: 1.0, g: 0.0, b: 0.0, a: 0.5 }, // CAR // red // hex: #FF0000
  2: { r: 1.0, g: 0.5, b: 0.5, a: 0.5 }, // BICYCLE // pink // hex: #FF8080
  3: { r: 0.0, g: 0.5, b: 1.0, a: 0.5 }, // BUS // blue // hex: #0080FF
  4: { r: 0.0, g: 0.5, b: 1.0, a: 0.5 }, // TRUCK // blue // hex: #0080FF
  5: { r: 1.0, g: 0.5, b: 0.5, a: 0.5 }, // CYCLIST // pink // hex: #FF8080
  6: { r: 1.0, g: 1.0, b: 0.5, a: 0.5 }, // MOTORCYCLE // yellow // hex: #FFFF80
  7: { r: 0.75, g: 1.0, b: 0.25, a: 0.5 }, // PEDESTRIAN // green // hex: #BFFF40
};

const trafficLightColorMap: Record<number, Color> = {
  0: { r: 0.0, g: 1.0, b: 0.0, a: 1.0 },    // CAR_TRAFFIC_LIGHT // red // hex: #00FF00
  1: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },    // PEDESTRIAN_TRAFFIC_LIGHT // yellow // hex: #FFFF00
};

// const defaultColor: Color = { r: 1, g: 0, b: 0, a: 1 };

const labelMap: Record<number, string> = {
  0: "UNKNOWN",
  1: "CAR",
  2: "TRUCK",
  3: "BUS",
  4: "BICYCLE",
  5: "MOTORBIKE",
  6: "PEDESTRIAN",
  7: "ANIMAL",
};

enum Classification {
  UNKNOWN = 0,
  CAR = 1,
  BICYCLE = 2,
  BUS = 3,
  TRUCK = 4,
  CYCLIST = 5,
  MOTORCYCLE = 6,
  PEDESTRIAN = 7,
}

// 3D
function createSceneUpdateMessage(header: Header, spheres: SpherePrimitive[], cubes: CubePrimitive[]): SceneUpdate {
  return {
    deletions: [],
    entities: [
      {
        id: spheres.length > 0 ? "predicted_objects" : "detected_objects",
        timestamp: header.stamp,
        frame_id: header.frame_id,
        frame_locked: false,
        lifetime: { sec: 1, nsec: 0 },
        metadata: [],
        arrows: [],
        cylinders: [],
        lines: [],
        spheres: spheres,
        texts: [],
        triangles: [],
        models: [],
        cubes: cubes,
      },
    ],
  };
}

function createCubePrimitive(x: number, y:number, z:number, position: Position, orientation: Orientation, color: Color): CubePrimitive
{
  return {
    color,
    size: { x, y, z },
    pose: {
      position: {
        x: position.x,
        y: position.y,
        z: position.z - 0.5 * z,
      },
      orientation,
    },
  };
}

function convertDetectedObjects(msg: DetectedObjects): SceneUpdate 
{
  const { header, objects } = msg;

  const cubePrimitives: CubePrimitive[] = objects.reduce((acc: CubePrimitive[], object) => {
    const { kinematics, shape, classification } = object;
    const { pose_with_covariance } = kinematics;
    const { position, orientation } = pose_with_covariance.pose;
    const { dimensions } = shape;
    const { x, y, z } = dimensions;

    if (
      classification.length === 0 ||
      !classification[0] ||
      classification[0].label === undefined
    ) {
      return acc;
    }

    const { label } = classification[0];
    const color = colorMap[label as keyof typeof colorMap] ?? { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

    const predictedObjectCube: CubePrimitive = createCubePrimitive(x, y, z, position, orientation, color);

    acc.push(predictedObjectCube);
    return acc;
  }, []);

  return createSceneUpdateMessage(header, [], cubePrimitives);
}

function convertTrackedObjects(msg: TrackedObjects): SceneUpdate 
{
  const { header, objects } = msg;

  const cubePrimitives: CubePrimitive[] = objects.reduce((acc: CubePrimitive[], object) => {
    const { kinematics, shape, classification } = object;
    const { pose_with_covariance } = kinematics;
    const { position, orientation } = pose_with_covariance.pose;
    const { dimensions } = shape;
    const { x, y, z } = dimensions;

    if (
      classification.length === 0 ||
      !classification[0] ||
      classification[0].label === undefined
    ) {
      return acc;
    }

    const { label } = classification[0];
    const color = colorMap[label as keyof typeof colorMap] ?? { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

    const predictedObjectCube: CubePrimitive = createCubePrimitive(x, y, z, position, orientation, color);

    acc.push(predictedObjectCube);
    return acc;
  }, []);

  return createSceneUpdateMessage(header, [], cubePrimitives);
}


function convertPredictedObjects(msg: PredictedObjects): SceneUpdate 
{
  const { header, objects } = msg;

  // create same thing but with spheres
  const spherePrimitives: SpherePrimitive[] = objects.reduce(
    (acc: SpherePrimitive[], object) => {
      const { kinematics, classification } = object;
      const { initial_pose_with_covariance, predicted_paths } = kinematics;

      if (
        classification.length === 0 ||
        !classification[0] ||
        classification[0].label === undefined
      ) {
        return acc;
      }

      const { label } = classification[0];
      const color = colorMap[label as keyof typeof colorMap] ?? { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

      // if the object is not unknown and has a predicted path, draw the path
      if (
        label !== Classification.UNKNOWN &&
        Math.floor(initial_pose_with_covariance.pose.position.x) > 0
      ) {
        const spherePath: SpherePrimitive[] = predicted_paths[0]!.path.map((pose) => {
          const sphere: SpherePrimitive = {
            color,
            size: { x: 0.25, y: 0.25, z: 0.25 },
            pose,
          };
          return sphere;
        });
        acc.push(...spherePath);
      }
      return acc;
    },
    [],
  );

  const cubePrimitives: CubePrimitive[] = objects.reduce((acc: CubePrimitive[], object) => {
    const { kinematics, shape, classification } = object;
    const { initial_pose_with_covariance } = kinematics;
    const { position, orientation } = initial_pose_with_covariance.pose;
    const { dimensions } = shape;
    const { x, y, z } = dimensions;

    if (
      classification.length === 0 ||
      !classification[0] ||
      classification[0].label === undefined
    ) {
      return acc;
    }

    const { label } = classification[0];
    const color = colorMap[label as keyof typeof colorMap] ?? { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

    const predictedObjectCube: CubePrimitive = createCubePrimitive(x, y, z, position, orientation, color);

    acc.push(predictedObjectCube);
    return acc;
  }, []);

  return createSceneUpdateMessage(header, spherePrimitives, cubePrimitives);
}


// 2D 
const trafficLightTypeMap: Record<number, string> = {
  0: "VehicleTL",
  1: "PedestrianTL"
};

function roiToPolyline(
  x: number,
  y: number,
  w: number,
  h: number
): Array<{ x: number; y: number }> {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y }, // close
  ];
}

function convertDetectedObjectsWithFeature(
  msg: DetectedObjectsWithFeature
): ImageAnnotations {
  const anns: ImageAnnotations = { circles: [], points: [], texts: [] };

  for (const object of msg.feature_objects ?? []) {
    const roi = object.feature?.roi;
    if (!roi) continue;

    if (
      object.object.classification.length === 0 ||
      !object.object.classification[0] ||
      object.object.classification[0].label === undefined
    ) {
      continue;
    }

    // ROS RegionOfInterest uses x_offset/y_offset + width/height
    const x = roi.x_offset;
    const y = roi.y_offset;
    const w = roi.width;
    const h = roi.height;

    const { label } = object.object.classification[0];
    const labelStr = labelMap[label as keyof typeof labelMap] || "UNKNOWN";
    const color = colorMap[label as keyof typeof colorMap] ?? { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
    color.a = 0.8; // make it more opaque for 2D outline
    const fill_color = { ...color, a: 0.2 }; // more transparent fill color
    const score = object.object.existence_probability;

    // Draw rectangle as a polyline (or switch to POLYGON if you want it filled)
    const poly: PointsAnnotation = {
      timestamp: msg.header.stamp,
      type: PointsAnnotationType.LINE_LOOP,
      thickness: 4,
      outline_color: color,
      outline_colors: [],
      fill_color: fill_color,
      points: roiToPolyline(x, y, w, h),
    };
    anns.points!.push(poly);

    // Optional: label text from the first classification
    const cls = object.object.classification[0];
    if (cls) {
      const txt: TextAnnotation = {
        timestamp: msg.header.stamp,
        position: { x, y: Math.max(0, y - 6) },
        text: `${labelStr}: ${score.toFixed(2)}`,
        text_color: color,
        background_color: { r: 0, g: 0, b: 0, a: 0.5 },
        font_size: 14,
      };
      anns.texts!.push(txt);
    }
  }

  return anns;
}

function convertTrafficLightRoi(msg: TrafficLightRoiArray): ImageAnnotations {
  const anns: ImageAnnotations = { circles: [], points: [], texts: [] };

  for (const tl of msg.rois ?? []) {
    const roi = tl.roi;
    if (!roi) continue;

    const x = roi.x_offset;
    const y = roi.y_offset;
    const w = roi.width;
    const h = roi.height;

    const typeStr = trafficLightTypeMap[tl.traffic_light_type as keyof typeof trafficLightTypeMap] ?? "TrafficLight";
    const color = trafficLightColorMap[tl.traffic_light_type as keyof typeof colorMap] ?? { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
    const fill_color = { ...color, a: 0.2 }; // more transparent fill color
    // 2D box as a closed loop
    const poly: PointsAnnotation = {
      timestamp: msg.header.stamp,
      type: PointsAnnotationType.LINE_LOOP,
      thickness: 4,
      outline_color: color,
      outline_colors: [],
      fill_color: fill_color,
      points: roiToPolyline(x, y, w, h),
    };
    anns.points!.push(poly);

    // label above the box (id + type)
    const label: TextAnnotation = {
      timestamp: msg.header.stamp,
      position: { x, y: Math.max(0, y - 6) },
      text: `TL:${tl.traffic_light_id} ${typeStr}`,
      text_color: color,
      background_color: { r: 0, g: 0, b: 0, a: 0.5 },
      font_size: 14,
    };
    anns.texts!.push(label);
  }

  return anns;
}

// Activate extensions
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_auto_perception_msgs/msg/PredictedObjects",
    toSchemaName: "foxglove.SceneUpdate",
    converter: convertPredictedObjects,
  });
  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_perception_msgs/msg/PredictedObjects",
    toSchemaName: "foxglove.SceneUpdate",
    converter: convertPredictedObjects,
  });

  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_auto_perception_msgs/msg/TrackedObjects",
    toSchemaName: "foxglove.SceneUpdate",
    converter: convertTrackedObjects,
  });
  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_perception_msgs/msg/TrackedObjects",
    toSchemaName: "foxglove.SceneUpdate",
    converter: convertTrackedObjects,
  });

  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_auto_perception_msgs/msg/DetectedObjects",
    toSchemaName: "foxglove.SceneUpdate",
    converter: convertDetectedObjects,
  });
  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_perception_msgs/msg/DetectedObjects",
    toSchemaName: "foxglove.SceneUpdate",
    converter: convertDetectedObjects,
  });
  extensionContext.registerMessageConverter({
    fromSchemaName: "tier4_perception_msgs/msg/DetectedObjectsWithFeature",
    toSchemaName: "foxglove.ImageAnnotations",
    converter: convertDetectedObjectsWithFeature,
  });
  extensionContext.registerMessageConverter({
    fromSchemaName: "tier4_perception_msgs/msg/TrafficLightRoiArray",
    toSchemaName: "foxglove.ImageAnnotations",
    converter: convertTrafficLightRoi
  });
}