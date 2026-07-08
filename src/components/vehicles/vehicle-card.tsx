import Image from "next/image";
import Link from "next/link";
import { Car, Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMiles } from "@/lib/units";

interface VehicleCardProps {
  vehicle: {
    id: string;
    name: string;
    make: string | null;
    model: string | null;
    year: number | null;
    fuelType: string;
    photoUrl: string | null;
    currentOdometer: number;
  };
}

const fuelTypeLabels: Record<string, string> = {
  GASOLINE: "Gasoline",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Electric",
  OTHER: "Other",
};

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const subtitle = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={`/vehicles/${vehicle.id}`} className="group block">
      <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-md">
        <div className="relative flex h-36 items-center justify-center bg-muted">
          {vehicle.photoUrl ? (
            <Image
              src={vehicle.photoUrl}
              alt={vehicle.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Car className="size-10 text-muted-foreground" />
          )}
          <Badge className="absolute right-2 top-2" variant="secondary">
            {fuelTypeLabels[vehicle.fuelType] ?? vehicle.fuelType}
          </Badge>
        </div>
        <CardContent className="flex flex-col gap-3 py-4">
          <div>
            <h3 className="truncate font-semibold leading-tight">
              {vehicle.name}
            </h3>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Gauge className="size-4" />
            {formatMiles(vehicle.currentOdometer)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
