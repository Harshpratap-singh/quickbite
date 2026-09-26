import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantCard from "../components/RestaurantCard";

const Home = () => {
  const { location } = useAppData();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  //lat1,lon1 => user location
  //lat2,lon2 => restaurant location
  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2); // Distance in km
  };

  const fetchRestaurants = async () => {
    if (!location?.longitude || !location?.latitude) {
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/all`,
        {
          params: {
            longitude: location.longitude,
            latitude: location.latitude,
            search,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setRestaurants(data.restaurants ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [search, location]);

  if (loading || !location) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">Finding restaurants near you...</p>
      </div>
    );
  }

  return <div className="mx-auto max-w-7xl px-4 py-6">
    {restaurants.length>0?(
     <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {
          restaurants.map((res)=>{
             const [resLng,resLat] = res.autoLocation.coordinates

             const distance = getDistanceKm(
              location.latitude,location.longitude,resLat,resLng
             );
             return <RestaurantCard key={res._id} id={res._id} name={res.name} image={res.image ?? ""}
             distance={`${distance}`}
             isOpen={res.isOpen}/>
          })
        }
     </div>
    ):(<div></div>)}
  </div>;
};

export default Home;
