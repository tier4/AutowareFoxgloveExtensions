import { Position } from "./Position";
import { Orientation } from "./Orientation";

export type TrajectoryPoint = {
  time_from_start: {
    sec: number;
    nsec: number;
  };
  pose: {
    position: Position;
    orientation: Orientation;
  };
  longitudinal_velocity_mps: number;
  lateral_velocity_mps: number;
  acceleration_mps2: number;
  heading_rate_rps: number;
  front_wheel_angle_rad: number;
  rear_wheel_angle_rad: number;
};
