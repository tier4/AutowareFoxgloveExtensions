import { CubePrimitive, SceneUpdate, SpherePrimitive, LinePrimitive, Point3, TextPrimitive } from "@foxglove/schemas";
import { PredictedObjects } from "./PredictedObjects";
import { TrackedObjects } from "./TrackedObjects";
import { DetectedObjects } from "./DetectedObjects";
import { Header } from "./Header";
import { Position } from "./Position";
import { Orientation } from "./Orientation";
// import { Dimensions } from "./Dimensions";
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

const labelToClassification: string[] = [
  "unknown",    // 0
  "car",        // 1
  "bicycle",    // 2
  "bus",        // 3
  "truck",      // 4
  "cyclist",    // 5
  "motorcycle", // 6
  "pedestrian", // 7
];

function createSceneUpdateMessage(header: Header, spheres: SpherePrimitive[], cubes: CubePrimitive[], lines: LinePrimitive[], texts: TextPrimitive[]): SceneUpdate {
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
        lines: lines,
        spheres: spheres,
        texts: texts,
        triangles: [],
        models: [],
        cubes: cubes,
      },
    ],
  };
}

// function createCubePrimitive(x: number, y:number, z: number, position: Position, orientation: Orientation, color: Color, dimensions: Dimensions): CubePrimitive
// {
//   return {
//     color,
//     size: { x, y, z},
//     pose: {
//       position: {
//         x: position.x,
//         y: position.y,
//         // make the cube start at the ground level (z = 0)
//         z: position.z - 0.5 * dimensions.z,
//       },
//       orientation,
//     },
//   };
// }
function createTextPrimitive( position: Position, orientation: Orientation, label: string): TextPrimitive {
  return {
    text: label,
    color: { r: 1.0, g: 0.0, b: 0.0, a: 0.5 },
    pose: { position, orientation },
    billboard: true,
    font_size: 8.0,
    scale_invariant: true,
  };
}
function convertDetectedObjects(msg: DetectedObjects): SceneUpdate 
{
  const { header, objects } = msg;

  const linePrimitives: LinePrimitive[] = objects.reduce((acc: LinePrimitive[], object) => {
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


    const predictedObjectLine: LinePrimitive = createLinePrimitive(x, y, z, position, orientation);
    
    acc.push(predictedObjectLine);
    return acc;
  }, []);
  
  const textPrimitives: TextPrimitive[] = objects.reduce((acc: TextPrimitive[], object) => {
    const { kinematics, classification } = object;
    const { pose_with_covariance } = kinematics;
    const { position, orientation } = pose_with_covariance.pose;

    if (
      classification.length === 0 ||
      !classification[0] ||
      classification[0].label === undefined
    ) {
      return acc;
    }

    const label = labelToClassification[classification[0].label] || "unknown";

    const predictedLabel: TextPrimitive = createTextPrimitive(position, orientation, label);
    
    acc.push(predictedLabel);
    return acc;
  }, []);
  return createSceneUpdateMessage(header, [], [], linePrimitives, textPrimitives);
}


function createLinePrimitive(x: number, y: number, z: number, position: Position, orientation: Orientation): LinePrimitive {
  const halfX = x / 2;
  const halfY = y / 2;
  const halfZ = z / 2;

  const points: Point3[] = [
    { x: -halfX, y: -halfY, z: -halfZ },
    { x: halfX, y: -halfY, z: -halfZ },
    { x: halfX, y: halfY, z: -halfZ },
    { x: -halfX, y: halfY, z: -halfZ },
    { x: -halfX, y: -halfY, z: halfZ },
    { x: halfX, y: -halfY, z: halfZ },
    { x: halfX, y: halfY, z: halfZ },
    { x: -halfX, y: halfY, z: halfZ },
  ];

  const indices = [
    0, 1, 1, 2, 2, 3, 3, 0,
    4, 5, 5, 6, 6, 7, 7, 4,
    0, 4, 1, 5, 2, 6, 3, 7
  ];

  return {
    type: 0,
    pose: {
      position,
      orientation,
    },
    thickness: 0.05,
    scale_invariant: false,
    points: points,
    color: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },
    indices: indices,
    colors:[]
  };
}


function convertTrackedObjects(msg: TrackedObjects): SceneUpdate 
{
  const { header, objects } = msg;

  const linePrimitives: LinePrimitive[] = objects.reduce((acc: LinePrimitive[], object) => {
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

    const linePrimitive: LinePrimitive = createLinePrimitive(x, y, z, position, orientation);

    acc.push(linePrimitive);
    return acc;
  }, []);

  return createSceneUpdateMessage(header, [], [], linePrimitives, []);
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

  const linePrimitives: LinePrimitive[] = objects.reduce((acc: LinePrimitive[], object) => {
    const { kinematics, shape, classification } = object;
    const { initial_pose_with_covariance } = kinematics;
    const { position, orientation } = initial_pose_with_covariance.pose;
    const { dimensions } = shape;
    const { x, y, z  } = dimensions;

    if (
      classification.length === 0 ||
      !classification[0] ||
      classification[0].label === undefined
    ) {
      return acc;
    }


    const predictedObjectLine: LinePrimitive = createLinePrimitive(x, y, z, position, orientation);

    acc.push(predictedObjectLine);
    return acc;
  }, []);

  return createSceneUpdateMessage(header, spherePrimitives, [], linePrimitives, []);
}


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
}
