export function isValidNatsSubject(subject: string): {
  isValid: boolean;
  error?: string;
} {
  if (!subject) {
    return { isValid: false, error: "Subject cannot be empty" };
  }

  if (/\s/.test(subject)) {
    return { isValid: false, error: "Subject cannot contain whitespace" };
  }

  // Check for invalid characters (anything that's not alphanumeric, dot, star, or greater than)
  const invalidCharMatch = subject.match(/[^a-zA-Z0-9.*>-]/);
  if (invalidCharMatch) {
    return {
      isValid: false,
      error: `Invalid character "${invalidCharMatch[0]}" in subject (only alphanumeric, dots, wildcards, and hyphens allowed)`,
    };
  }

  // Check for subject ending with a dot
  if (subject.endsWith(".")) {
    return {
      isValid: false,
      error:
        "Subject cannot end with a dot - must end with a token or wildcard",
    };
  }

  // Check for valid token structure
  const tokens = subject.split(".");
  if (tokens.some((token) => token.length === 0)) {
    return {
      isValid: false,
      error: "Empty tokens are not allowed (e.g., foo..bar)",
    };
  }

  // Check for valid wildcard usage
  if (subject.includes("*") && !subject.endsWith("*")) {
    return {
      isValid: false,
      error: "Wildcard * can only appear at the end of a token",
    };
  }

  if (subject.includes(">") && !subject.endsWith(">")) {
    return {
      isValid: false,
      error: "Wildcard > can only appear at the end of the subject",
    };
  }

  return { isValid: true };
}

// Validate JetStream subject against both base rules and prefix patterns
export function isValidJetStreamSubject(
  subject: string,
  prefixes: string[]
): { isValid: boolean; error?: string } {
  // First check base NATS subject rules
  const baseValidation = isValidNatsSubject(subject);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Then check if it matches any of the stream's patterns
  const matchesPattern = prefixes.some((prefix) =>
    isValidSubject(subject, prefix)
  );
  if (!matchesPattern) {
    return {
      isValid: false,
      error: "Subject must match one of the stream's patterns",
    };
  }

  return { isValid: true };
}

function isValidSubject(subject: string, prefix: string): boolean {
  if (prefix.endsWith("*")) {
    const base = prefix.slice(0, -1);
    const remaining = subject.slice(base.length);
    // Must match exactly one token without dots after the prefix
    return (
      subject.startsWith(base) &&
      !remaining.includes(".") &&
      remaining.length > 0
    );
  } else if (prefix.endsWith(">")) {
    const base = prefix.slice(0, -1);
    // Can match any number of tokens after the prefix
    return subject.startsWith(base);
  } else {
    // Must match exactly
    return subject === prefix;
  }
}
