'use client'

import React from 'react'
import { InputGroup } from '@/components/ui/InputGroup'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#111214] flex items-center justify-center p-6 font-manrope">
      {/* Container with border right as seen in some split designs, or just centered */}
      <div className="w-full max-w-[440px] flex flex-col gap-8 bg-[#151618] p-10 rounded-2xl border border-white/5 shadow-2xl">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-white font-bold text-3xl tracking-tight">
            Create an account
          </h1>
          <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.2em]">
            Fill in the form below to create your account
          </p>
        </div>

        {/* Form Section */}
        <div className="flex flex-col gap-5">
          <InputGroup 
            title="Email Address"
            placeholder="e.g. steve.jobs@gmail.com"
            description="We'll use this to contact you. We will not share your email."
            rightIcon={
              <Image src="/icons/lock.svg" alt="Lock" width={16} height={16} className="opacity-30" />
            }
          />

          <InputGroup 
            title="Password"
            placeholder="Enter your password..."
            description="Must be at least 8 characters long."
            rightIcon={
              <Image src="/icons/eye.svg" alt="Eye" width={16} height={16} className="opacity-30" />
            }
          />

          <Button variant="primary" className="w-full h-[44px] mt-4 shadow-lg shadow-purple-500/10">
            Login
          </Button>
        </div>

        {/* Divider Section */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-[1px] bg-white/5" />
          <span className="text-white/20 font-mono text-[10px] uppercase tracking-[0.3em] whitespace-nowrap">
            Or continue with
          </span>
          <div className="flex-1 h-[1px] bg-white/5" />
        </div>

        {/* Social Login Section */}
        <Button variant="secondary" className="w-full h-[44px] gap-3" leftIcon={
          <Image src="/icons/globe.svg" alt="Google" width={18} height={18} className="opacity-60" />
        }>
          Login with Google
        </Button>

        {/* Footer Text */}
        <div className="flex flex-col gap-1 items-center mt-6">
          <p className="text-white/20 text-[11px] text-center">
            By creating an account, you agree to our Terms and Conditions.
          </p>
          <p className="text-white/40 text-[12px] font-medium mt-2">
            Always your number one, till infinity and beyond! ✨
          </p>
        </div>
      </div>
    </main>
  )
}
