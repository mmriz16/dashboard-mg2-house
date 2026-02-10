'use client'

import React from 'react'
import { InputGroup } from '@/components/ui/InputGroup'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <main className="w-full min-h-screen bg-[#171717] flex items-center">
      {/* 1440px Wrapper relative to Figma design */}
      <div className="w-full h-screen relative bg-neutral-900 overflow-hidden mx-auto max-w-[1440px]">
        
        {/* Left Side Section (720px wide) */}
        <div className="w-full md:w-[720px] h-full px-10 md:px-40 py-6 left-0 top-0 absolute bg-neutral-900 border-r border-white/10 inline-flex flex-col justify-center items-center gap-6 shadow-2xl">
          
          {/* Header */}
          <div className="self-stretch flex flex-col justify-start items-start gap-0.5">
            <div className="self-stretch justify-start text-white text-2xl font-bold font-manrope">
              Create an account
            </div>
            <div className="self-stretch justify-start text-white/70 text-xs font-normal font-mono uppercase tracking-wider">
              Fill in the form below to create your account
            </div>
          </div>

          {/* Email Input Group */}
          <div className="w-full md:w-96 flex flex-col justify-start items-start gap-2.5">
            <div className="self-stretch justify-start text-white text-sm font-normal font-manrope">
              Email Address
            </div>
            <div className="self-stretch h-10 px-4 py-4 bg-neutral-900 rounded-lg outline outline-1 outline-offset-[-1px] outline-white/10 inline-flex justify-start items-center gap-2.5 group focus-within:outline-purple-500/50 transition-all">
              <div className="w-4 h-4 relative flex items-center justify-center">
                <Image src="/icons/lock.svg" alt="Lock" width={14} height={14} className="invert opacity-70" />
              </div>
              <input 
                placeholder="e.g. steve.jobs@gmail.com" 
                className="flex-1 bg-transparent border-none outline-none text-white/50 text-sm font-normal font-manrope placeholder:text-white/20"
              />
            </div>
            <div className="self-stretch inline-flex justify-between items-center">
              <div className="flex-1 justify-start text-white/70 text-[10px] font-normal font-mono uppercase leading-5 opacity-80">
                We'll use this to contact you. We will not share your email with anyone else.
              </div>
            </div>
          </div>

          {/* Password Input Group */}
          <div className="w-full md:w-96 flex flex-col justify-start items-start gap-2.5 text-ellipsis overflow-hidden">
            <div className="self-stretch justify-start text-white text-sm font-normal font-manrope">
              Password
            </div>
            <div className="self-stretch h-10 px-4 py-4 bg-neutral-900 rounded-lg outline outline-1 outline-offset-[-1px] outline-white/10 inline-flex justify-start items-center gap-2.5 group focus-within:outline-purple-500/50 transition-all">
              <div className="w-4 h-4 relative flex items-center justify-center">
                <Image src="/icons/lock.svg" alt="Lock" width={14} height={14} className="invert opacity-70" />
              </div>
              <input 
                type="password"
                placeholder="Enter your password..." 
                className="flex-1 bg-transparent border-none outline-none text-white/50 text-sm font-normal font-manrope placeholder:text-white/20"
              />
              <div className="w-4 h-4 relative flex items-center justify-center cursor-pointer">
                <Image src="/icons/eye.svg" alt="Eye" width={14} height={14} className="invert opacity-30 hover:opacity-70 transition-opacity" />
              </div>
            </div>
            <div className="self-stretch inline-flex justify-between items-center">
              <div className="flex-1 justify-start text-white/70 text-[10px] font-normal font-mono uppercase opacity-80">
                Must be at least 8 characters long.
              </div>
            </div>
          </div>

          {/* Login Button */}
          <button className="w-full md:w-96 h-10 px-3 py-2.5 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-white/10 inline-flex justify-center items-center gap-2.5 active:scale-[0.98] transition-all hover:bg-white/90">
            <div className="justify-start text-black text-sm font-semibold font-manrope">Login</div>
          </button>

          {/* Divider */}
          <div className="w-full md:w-96 inline-flex justify-center items-center gap-3.5">
            <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
            <div className="text-center justify-start text-white/70 text-[10px] font-normal font-mono uppercase tracking-widest whitespace-nowrap">
              Or continue with
            </div>
            <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
          </div>

          {/* Social Footer */}
          <div className="mt-4 flex flex-col items-center gap-2">
             <p className="text-white/20 text-[11px] font-manrope">Always your number one, till infinity and beyond! ✨</p>
          </div>
        </div>

        {/* Right Side Section (For visual/illustration if needed) */}
        <div className="hidden md:block absolute left-[720px] top-0 w-[720px] h-full bg-[#0A0A0A]/50">
           {/* Space for background image or dashboard preview */}
        </div>

      </div>
    </main>
  )
}
