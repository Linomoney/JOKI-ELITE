'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, DeleteIcon, Home, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function TopupSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const order = params.get('orderId');
    if (order) setOrderId(order);
  }, [params]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full"
      >
        <div className="text-center">
          <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <DeleteIcon className="text-red-500" size={48} />
          </div>
          
          <h1 className="text-3xl font-black mb-4">Payment Failed! 😢</h1>
          <p className="text-zinc-400 mb-6">
            Your topup has failed. Please try again or contact support.
          </p>
          
          {orderId && (
            <div className="bg-black/50 p-4 rounded-xl mb-6">
              <p className="text-sm text-zinc-400">Order ID</p>
              <p className="font-mono font-black">{orderId}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Home size={20} />
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/dashboard/topup')}
              className="py-3 bg-zinc-800 border border-zinc-700 rounded-xl font-black hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Topup Again
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}