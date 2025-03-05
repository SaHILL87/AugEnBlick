import Tick from '@/components/images/tick';
import ThreeJSDraggableScene from '@/components/landing/model'
import Navbar from '@/components/navbar'
import { ArrowRight, Sparkles } from 'lucide-react';
import   { useEffect, useState } from 'react'
import { Marquee } from "@devnomic/marquee";
const marketingPhrases = [
  "Cost effective. Save on development costs with ready-made features.",
  "Lightning fast. Build and deploy in seconds.",
  "Developer friendly. Best-in-class DX that developers love.",
  "Production ready. Enterprise-grade reliability and scalability."
];
// if you copy ala shadcn, no need import css.
import "@devnomic/marquee/dist/index.css";
import TextMarquee from '@/components/landing/marquee-text';
import { useNavigate } from 'react-router-dom';


const LandingPage = () => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentPhraseIndex((prevIndex) => 
          (prevIndex + 1) % marketingPhrases.length
        );
        setIsVisible(true);
      }, 1000); // Wait for fade out before changing text
      
    }, 4000); // Change text every 4 seconds

    return () => clearInterval(intervalId);
  }, []);

  const navigate = useNavigate()

  return (
    <div className='min-h-screen overflow-x-hidden'>
        <div className='relative text-white min-h-screen border-none outline-none m-0'>
        <ThreeJSDraggableScene />
          <Navbar />

          <div className='flex flex-col w-full h-full  items-center  gap-6 mt-4'>

          <div className="flex w-fit items-center h-full gap-3 bg-zinc-900/50 rounded-full px-6 py-2 border border-zinc-800 hover:scale-110 transition-all duration-300 cursor-pointer">
        <div className="flex items-center gap-2 ">
          <div className="bg-pink-500/10 rounded-full p-2 ">
            <Sparkles className="w-3 h-3 text-pink-500" />
          </div>
          <span className="text-pink-500 text-xs font-medium">New</span>
        </div>
        
        <span className='text-xs'>AI copilot ready to drop in your collaboration</span> 

        <ArrowRight className="w-4 h-4" />

      </div>

      <div className='flex flex-col items-center gap-6 max-w-4xl text-center'>
        <h2 className='text-6xl font-bold max-w-4xl text-center'>Ready‑made features for AI & human collaboration</h2>

        <p className='text-lg font-semibold text-gray-200/70'>The best apps in the AI era aren’t solo experiences—they’re collaborative. <span className='text-white'>Clab.ai</span> provides customizable pre‑built features to make your product multiplayer, engaging, and AI‑ready. All without derailing your roadmap.</p>
      </div>

    <div>
      <button onClick={()=>navigate("/home")} className='bg-white/90 flex gap-1 mb-14 items-center rounded-lg text-black px-4 py-2  font-semibold'>Get Started <ArrowRight className=''  />  </button>
    </div>

          <div className="flex items-center gap-1 justify-center  absolute bottom-0 p-1" >
         <Tick className="text-pink-500" /> 

          <p 
            className={`text-md md:text-xl transition-opacity duration-1000 text-center
              ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {marketingPhrases[currentPhraseIndex]}
          </p>
        </div>
          </div>
        </div>

      <div className='bg-black h-full py-[5rem]'>
      <TextMarquee  />
      </div>

        <div className='bg-black h-full p-[5rem]'>
        <div className='w-full h-full flex justify-center items-center '>
        <Marquee fade={true} >
  <div className='relative rounded-xl overflow-hidden'>
    <div className="absolute p-2 ">
      <h1 className='text-xl font-bold text-black'>AI Copilot</h1>
      <p className='font-medium text-gray-500'>like Microsoft Copilot</p>
    </div>
    <img src="/cards/ai-companion-like-microsoft-copilot.webp" alt="" className='w-[20rem]' />
  </div>
  <div className='relative rounded-xl overflow-hidden'>
    <div className="absolute p-2 ">
    <h1 className='text-xl font-bold text-black'>Co editing</h1>
    <p className='font-medium text-gray-500'>like Google Docs</p>
    </div>
    <img src="cards/co-editing-like-google-docs.png" alt="" className='w-[20rem]' />
  </div>
  <div className='relative rounded-xl overflow-hidden'>
  <div className="absolute p-2 ">
    <h1 className='text-xl font-bold text-black'>Editing Tools</h1>
    <p className='font-medium text-gray-500'>like Canva</p>
    </div>
    <img src="/cards/image (1).webp" alt="" className='w-[20rem]' />
  </div>
  <div className='relative rounded-xl overflow-hidden'>
    <div className="absolute p-2 ">
    <h1 className='text-xl font-bold text-black'>Whiteboard</h1>
    <p className='font-medium text-gray-500'>like Miro</p>
    </div>
    <img src="/cards/image (2).webp" alt="" className='w-[20rem]' />
  </div>
  <div className='relative rounded-xl overflow-hidden'>
  <div className="absolute p-2 ">
    <h1 className='text-xl font-bold text-black'>AI copilots</h1>
    <p className='font-medium text-gray-500'>like Notion</p>
    </div>
    <img src="/cards/image.webp" alt="" className='w-[20rem]' />
  </div>

</Marquee>
        </div>
        </div>
    </div>
  )
}

export default LandingPage