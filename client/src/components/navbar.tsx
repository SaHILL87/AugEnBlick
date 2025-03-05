"use client"

import * as React from "react"
import {Link} from "react-router-dom"
import { ArrowRight, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 w-full  backdrop-blur max-w-6xl mx-auto ">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="font-bold text-2xl">
            Clab.ai
          </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="#features" className="text-sm font-medium transition-colors hover:text-gray">
            Features
          </Link>
          <Link to="#pricing" className="text-sm font-medium transition-colors hover:text-gray">
            Pricing
          </Link>
          <Link to="#about" className="text-sm font-medium transition-colors hover:text-gray">
            About
          </Link>
          <Link to="#contact" className="text-sm font-medium transition-colors hover:text-gray">
            Contact
          </Link>
        </nav>
        </div>

        {/* Desktop Navigation */}


        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Button className="bg-gray-500/10 hover:bg-gray-300/10 hover:text-white/90" size="sm" asChild>
            <Link to="/login" className="flex items-center gap-1">
              Book a demo 
            </Link>
          </Button>
          <Button className="bg-white text-black hover:bg-white/60" size="sm" asChild>
            <Link to="/signup" className="flex items-center gap-1">
               Login <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col bg-black text-white border-none outline-none" >
            <div className="flex items-center justify-between">
              <Link to="/" className="font-bold text-xl" onClick={() => setIsOpen(false)}>
                Brand
              </Link>
            </div>
            <nav className="mt-8 flex flex-col gap-4">
              <Link
                to="#features"
                className="text-base font-medium transition-colors hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Features
              </Link>
              <Link
                to="#pricing"
                className="text-base font-medium transition-colors hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="#about"
                className="text-base font-medium transition-colors hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                to="#contact"
                className="text-base font-medium transition-colors hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
            </nav>
            <div className="mt-auto flex flex-col gap-4 pt-8">
              <Button variant="outline" asChild>
                <Link to="/login" className="flex items-center justify-center gap-1" onClick={() => setIsOpen(false)}>
                  Login <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link
                  to="/signup"
                  className="flex items-center justify-center gap-1"
                  onClick={() => setIsOpen(false)}
                >
                  Sign up <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

