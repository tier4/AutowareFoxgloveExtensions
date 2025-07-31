import { Header } from "./Header";
import { TrajectoryPoint } from "./TrajectoryPoint";

export type Trajectory = {
  header: Header;
  points: TrajectoryPoint[];
};
