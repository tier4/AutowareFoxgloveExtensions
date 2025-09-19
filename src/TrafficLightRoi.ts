import { Header } from "./Header";
import { RegionOfInterest } from "./RegionOfInterest";

export type TrafficLightRoiArray = {
  header: Header;
  rois: TrafficLightRoi[];
};

export type TrafficLightRoi = {
    roi: RegionOfInterest;
    traffic_light_id: number;
    traffic_light_type: number;
}