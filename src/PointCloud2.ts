import { Header } from "./Header";

  export type PointField = {
    name: string;
    offset: number;
    datatype: number;
    count: number;
  }
  export type PointCloud2 = {
    header: Header;
    height: number;
    width: number;
    fields: PointField[];
    is_bigendian: boolean;
    point_step: number;
    row_step: number;
    data: Uint8Array | number[];
    is_dense: boolean;
  }

