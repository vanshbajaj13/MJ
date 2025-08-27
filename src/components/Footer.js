export default function Footer() {
    return (
      <footer className="static bottom-0 left-0 right-0 bg-black text-white py-3 z-50">
        <div className="container mx-auto text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} MJ Men Jewelry. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }
  