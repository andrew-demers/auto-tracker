"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatsVehicleSelectProps {
  vehicles: { id: string; name: string }[];
  selectedVehicleId: string;
}

/** Vehicle picker for the Stats page - navigating updates the `vehicle`
 * query param, which the server component re-fetches stats for. */
export function StatsVehicleSelect({
  vehicles,
  selectedVehicleId,
}: StatsVehicleSelectProps) {
  const router = useRouter();

  const items = [
    { label: "All vehicles", value: "all" },
    ...vehicles.map((vehicle) => ({ label: vehicle.name, value: vehicle.id })),
  ];

  return (
    <Select
      items={items}
      value={selectedVehicleId}
      onValueChange={(value) => {
        if (value) router.push(`/stats?vehicle=${value}`);
      }}
    >
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="Select a vehicle" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All vehicles</SelectItem>
        {vehicles.map((vehicle) => (
          <SelectItem key={vehicle.id} value={vehicle.id}>
            {vehicle.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
