/**
 * Origins of muscle heads that the model splits but the reference article describes as one
 * muscle. The article lists every head's origin; a head named "ulnar" starts on the ulna, not the
 * humerus. Keys are catalog group keys; values are catalog bone keys. Standard textbook anatomy,
 * as in the linked articles (OpenStax A&P 2e chapter 11 and the Wikipedia entries).
 */
export const HEAD_ORIGINS: Record<string, string[]> = {
  "superficial-head-of-pronator-teres": ["humerus"],
  "deep-head-of-pronator-teres": ["ulna"],
  "humeral-head-of-flexor-carpi-ulnaris": ["humerus"],
  "ulnar-head-of-flexor-carpi-ulnaris": ["ulna"],
  "humeral-head-of-extensor-carpi-ulnaris": ["humerus"],
  "ulnar-head-of-extensor-carpi-ulnaris": ["ulna"],
  "humero-ulnar-head-of-flexor-digitorum-superficialis": ["humerus", "ulna"],
  "radial-head-of-flexor-digitorum-superficialis": ["radius"],
  "long-head-of-biceps-brachii": ["scapula"],
  "short-head-of-biceps-brachii": ["scapula"],
  "long-head-of-triceps-brachii": ["scapula"],
  "lateral-head-of-triceps-brachii": ["humerus"],
  "medial-head-of-triceps-brachii": ["humerus"],
  "long-head-of-biceps-femoris": ["hip-bone"],
  "short-head-of-biceps-femoris": ["femur"],
  "lateral-head-of-gastrocnemius": ["femur"],
  "medial-head-of-gastrocnemius": ["femur"],
  "clavicular-head-of-pectoralis-major-muscle": ["clavicle"],
  "sternocostal-head-of-pectoralis-major-muscle": ["manubrium-of-sternum", "body-of-sternum"],
  "clavicular-part-of-deltoid-muscle": ["clavicle"],
  "acromial-part-of-deltoid-muscle": ["scapula"],
  "scapular-spinal-part-of-deltoid-muscle": ["scapula"],
  "anterior-belly-of-digastric-muscle": ["mandible"],
  "posterior-belly-of-digastric-muscle": ["temporal-bone"],
  "superficial-head-of-flexor-pollicis-brevis": ["trapezium-bone"],
  "deep-head-of-flexor-pollicis-brevis": ["trapezoid-bone", "capitate-bone"],
  "oblique-head-of-adductor-pollicis": ["capitate-bone", "second-metacarpal-bone", "third-metacarpal-bone"],
  "transverse-head-of-adductor-pollicis": ["third-metacarpal-bone"],
};
