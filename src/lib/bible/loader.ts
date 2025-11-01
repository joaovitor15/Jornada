
export const getBookData = async (abbrev: string) => {
  try {
    // Dynamically import the book based on its abbreviation
    const bookModule = await import(`@/lib/bible/nvi/${abbrev}`);
    return bookModule.default;
  } catch (error) {
    console.error(`Could not load bible book: ${abbrev}`, error);
    // Return null or throw a more specific error if the book isn't found
    // For now, we'll show a message to the user.
    throw new Error(
      `O livro "${abbrev}" não foi encontrado nos dados locais. Apenas "Gênesis" (gn) está disponível nesta versão.`
    );
  }
};
