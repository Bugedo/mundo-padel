import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 py-6 mt-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Contact Info */}
        <div className="text-center md:text-left space-y-1">
          <p>Mundopadel</p>
          <p>📱 +1 (555) 123-4567</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>

        {/* Developer Credit */}
        <div className="text-center md:text-right">
          <p>
            Powered by{' '}
            <Link
              href="https://www.developingbridges.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Developing Bridges
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
