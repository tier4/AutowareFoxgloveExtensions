import { Time } from "@foxglove/schemas/dist/types/Time";

export type Header = {
  stamp: Time;
  frame_id: string;
};
