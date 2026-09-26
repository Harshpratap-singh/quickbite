import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import { useNavigate } from "react-router-dom";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const Checkout = () => {
  const { cart, subTotal, quantity } = useAppData();

  const [address, setAddress] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAddress = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }
      try {
        const { data } = await axios.get(
          `${restaurantService}/api/address/all`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        setAddress(data.addresses || []);
      } catch (error) {
        console.log(error);
        setLoadingAddress(false);
      } finally {
        setLoadingAddress(false);
      }
    };
    fetchAddress();
  }, [cart]);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] item-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;

  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformfee = 7;

  const grandTotal = subTotal + deliveryFee + platformfee;

  const createOrder = async (paymentMethod: "razorpay" | "stripe") => {
    if (!selectedAddressId) return null;
    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        {
          paymentMethod,
          addressId: selectedAddressId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return data;
    } catch (error) {
      toast.error("Failed to create Order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);
      const order = await createOrder("razorpay");
      if (!order) return;

      const { orderId, amount } = order;
      const { data } = await axios.post(`${utilsService}/api/payment/create`, {
        orderId,
      });

      const { razorpayOrderId, key } = data;
      const options = {
        key,
        amount: amount * 100,
        currency: "INR",
        name: "QuickBite",
        description: "Food Order Payment",
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success("Payment Successful");

            navigate("/paymentsuccess/" + response.razorpay_payment_id);
          } catch (error) {
            toast.error("Payment Verification Failed");
          }
        },
        theme: {
          color: "#E23744",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.log(error);
      toast.error("Razorpay payment failed please refresh page");
    } finally {
      setLoadingRazorpay(false);
    }
  };

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);
      const order = await createOrder("stripe");
      if (!order) return;
      const { orderId } = order;
      try {
        await stripePromise;
        const { data } = await axios.post(
          `${utilsService}/api/payment/stripe/create`,
          {
            orderId,
          },
        );

        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error("Failed to create payment session");
        }
      } catch (error) {
        toast.error("Failed to initialize stripe");
      }
    } catch (error) {
      console.log(error);
      toast.error("Stripe payment failed");
    } finally {
      setLoadingStripe(false);
    }
  };

  console.log("add", address);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold"> Checkout</h1>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{restaurant.name}</h2>
        <p className="text-sm text-gray-500">
          {restaurant.autoLocation.formattedAddress}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Delivery Address</h3>

        {loadingAddress ? (
          <p className="text-sm text-gray-500">Loading addresses.....</p>
        ) : address.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No address found. Please add one
          </p>
        ) : (
          address.map((add) => (
            <label
              key={add._id}
              className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition ${selectedAddressId === add._id ? "border-[#e23744] bg-red-50" : "hover:bg-gray-50"}`}
            >
              <input
                type="radio"
                checked={selectedAddressId === add._id}
                onChange={() => setSelectedAddressId(add._id)}
              />
              <div>
                <p className="text-sm font-medium">{add.formattedAddress}</p>
                <p className="text-xs text-gray-500">{add.mobile}</p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
        <h3 className="font-semibold">Order Summary</h3>
        {cart.map((cartItem: ICart) => {
          const item = cartItem.itemId as IMenuItem;
          return (
            <div key={cartItem._id} className="flex justify-between text-sm">
              <span>
                {item.name} x {cartItem.quantity}
              </span>
              <span>₹{item.price * cartItem.quantity}</span>
            </div>
          );
        })}
        <hr />
        <div className="flex justify-between text-sm">
          <span>Items {quantity}</span>
          <span>₹{subTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span>
          <span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>PlatForm Fee</span>
          <span>₹{platformfee}</span>
        </div>
        {subTotal < 250 && (
          <p className="text-xs text-gray-500">
            Add Item worth ₹{250 - subTotal} more to get Free delivery
          </p>
        )}

        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Grand Total</span>
          <span>₹{grandTotal}</span>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Payment Method</h3>
        <button
          disabled={!selectedAddressId || loadingRazorpay || creatingOrder}
          onClick={payWithRazorpay}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D7FF9] py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loadingRazorpay ? (
            <BiLoader size={18} className="animate-spin" />
          ) : (
            <BiCreditCard size={18} />
          )}
          Pay With Razorpay
        </button>

        <button
          disabled={!selectedAddressId || loadingStripe || creatingOrder}
          onClick={payWithStripe}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loadingStripe ? (
            <BiLoader size={18} className="animate-spin" />
          ) : (
            <BiCreditCard size={18} />
          )}
          Pay With Stripe
        </button>
      </div>
    </div>
  );
};

export default Checkout;
