import { PointCloud2 } from "./PointCloud2";
import { RegionOfInterest } from "./RegionOfInterest";

export type Feature = {
  cluster: PointCloud2;
  roi: RegionOfInterest;
};