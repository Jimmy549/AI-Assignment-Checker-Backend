import { Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';

@Injectable()
export class PdfService {
  async extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(fileBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  async extractStudentInfo(fileName: string): Promise<{
    name: string;
    rollNumber: string;
  }> {
    // Remove .pdf extension
    const nameWithoutExt = fileName.replace(/\.pdf$/, '').trim();

    // 1. Try "Name_RollNo" or "RollNo_Name" (Underscore separator)
    // Matches: "John Doe_123.pdf", "123_John Doe.pdf"
    const underscoreMatch = nameWithoutExt.match(/^([^_]+)_([^_]+)$/i);
    if (underscoreMatch) {
      const part1 = underscoreMatch[1].trim();
      const part2 = underscoreMatch[2].trim();
      
      // Heuristic: If part1 has digits and part2 doesn't, part1 is roll no.
      if (/\d/.test(part1) && !/\d/.test(part2)) {
        return { name: part2, rollNumber: part1 };
      }
      // Heuristic: If part2 has digits and part1 doesn't, part2 is roll no.
      if (/\d/.test(part2) && !/\d/.test(part1)) {
        return { name: part1, rollNumber: part2 };
      }
      // Default fallback: Name_RollNo
      return { name: part1, rollNumber: part2 };
    }

    // 2. Try "Name-RollNo" or "RollNo-Name" (Hyphen separator)
    const hyphenMatch = nameWithoutExt.match(/^([^-]+)-([^-]+)$/i);
    if (hyphenMatch) {
       const part1 = hyphenMatch[1].trim();
       const part2 = hyphenMatch[2].trim();
       
       if (/\d/.test(part1) && !/\d/.test(part2)) {
         return { name: part2, rollNumber: part1 };
       }
       if (/\d/.test(part2) && !/\d/.test(part1)) {
         return { name: part1, rollNumber: part2 };
       }
       return { name: part1, rollNumber: part2 };
    }

    // 3. Try "Name RollNo" (Space separator) - last word is likely roll number
    // Matches: "jameel 13", "John Doe 45", etc.
    const spaceMatch = nameWithoutExt.match(/^(.+?)\s+(\d+(?:[a-zA-Z]*)?)$/i);
    if (spaceMatch) {
      const name = spaceMatch[1].trim();
      const rollNumber = spaceMatch[2].trim();
      if (name && rollNumber) {
        return { name, rollNumber };
      }
    }

    // 4. Fallback: Use filename as name, Roll No 'Unknown'
    return {
      name: nameWithoutExt,
      rollNumber: 'Unknown',
    };
  }
}