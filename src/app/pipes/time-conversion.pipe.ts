import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeConversion',
  standalone : true
})
export class TimeConversionPipe implements PipeTransform {

  transform(value: number, unit: 'secs' | 'mins' | 'hrs' = 'secs'): string {
    // Convert input to seconds first (if needed)
    let totalSeconds = value;
    
    if (unit === 'mins') {
      totalSeconds = value * 60;
    } else if (unit === 'hrs') {
      totalSeconds = value * 3600;
    }

    // Now convert to the best readable format
    const days = Math.floor(totalSeconds / 86400);
    const remainingAfterDays = totalSeconds % 86400;
    const hours = Math.floor(remainingAfterDays / 3600);
    const remainingAfterHours = remainingAfterDays % 3600;
    const minutes = Math.floor(remainingAfterHours / 60);
    const seconds = remainingAfterHours % 60;

    let result = '';

    if (days > 0) {
      result += `${days} day${days > 1 ? 's' : ''} `;
    }
    if (hours > 0) {
      result += `${hours} hr${hours > 1 ? 's' : ''} `;
    }
    if (minutes > 0 && days === 0) { // Only show minutes if < 1 day
      result += `${minutes} min${minutes > 1 ? 's' : ''} `;
    }
    if (seconds > 0 && days === 0 && hours === 0) { // Only show seconds if < 1 hr
      result += `${seconds} sec${seconds > 1 ? 's' : ''}`;
    }

    return result.trim() || '0 secs'; // Fallback if value is 0
  }
}