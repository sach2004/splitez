export default function Logo() {
  return (
    <div className="flex items-center justify-center gap-2.5 pt-1">
      <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-mint-700 text-[22px] font-black leading-none text-white shadow-[0_8px_20px_rgba(0,128,105,.18)]">
        S
      </div>
      <div className="text-[26px] font-black tracking-tight">
        Split<span className="text-mint-500 dark:text-mint-300">EZ</span>
      </div>
    </div>
  );
}
