"use client";

export default function LoadingScreen() {
  return (
    <>
      <div className="fixed inset-0 bg-gray-200 flex items-center justify-center">
      <div className="ball">
        <div className="wave delay">
          <div className="wave"></div>
        </div>
      </div>
    </div>
    </>
  );
}
