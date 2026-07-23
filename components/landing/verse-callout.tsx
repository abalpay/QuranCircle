import Image from "next/image";
import { GeometricRosette } from "@/components/landing/decorative-art";

export default function VerseCallout() {
  return (
    <aside className="landing-verse" aria-label="Quran verse">
      <div className="landing-verse-illustration">
        <Image
          src="/illustrations/quran-verse.png"
          alt="A closed Qur’an resting on a folded star-shaped textile ornament"
          width={720}
          height={720}
          sizes="(max-width: 767px) 150px, 190px"
        />
      </div>

      <blockquote>
        <span className="landing-quote-mark" aria-hidden="true">
          “
        </span>
        <p>
          And certainly, We have made the Qur’an easy for remembrance, so is
          there any who will remember?
        </p>
        <cite>Surah Al-Qamar (54:17)</cite>
      </blockquote>

      <GeometricRosette className="landing-verse-rosette" />
    </aside>
  );
}
