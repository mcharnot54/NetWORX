import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    const { preview } = await request.json();
    
    // Get all files from data_files table
    const allFiles = await sql`
      SELECT id, file_name, scenario_id, processing_status, data_type, file_type, created_at, processed_data
      FROM data_files
      ORDER BY file_name, created_at DESC
    `;

    // Group files by name to identify duplicates
    const fileGroups: { [key: string]: any[] } = {};
    
    for (const file of allFiles) {
      if (!fileGroups[file.file_name]) {
        fileGroups[file.file_name] = [];
      }
      fileGroups[file.file_name].push(file);
    }

    // Identify duplicates and which to keep/remove
    const duplicateAnalysis = [];
    const filesToRemove = [];
    let totalDuplicates = 0;

    for (const [fileName, files] of Object.entries(fileGroups)) {
      if (files.length > 1) {
        totalDuplicates += files.length - 1; // All but one are duplicates
        
        // Sort by priority: completed > pending > failed, then by most recent
        const sortedFiles = files.sort((a, b) => {
          // Priority order: completed > pending > failed
          const statusPriority = { completed: 3, pending: 2, failed: 1 };
          const aPriority = statusPriority[a.processing_status as keyof typeof statusPriority] || 0;
          const bPriority = statusPriority[b.processing_status as keyof typeof statusPriority] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          
          // If same status, prefer the one with processed_data
          const aHasData = a.processed_data ? 1 : 0;
          const bHasData = b.processed_data ? 1 : 0;
          
          if (aHasData !== bHasData) {
            return bHasData - aHasData; // With data first
          }
          
          // If same data status, prefer most recent
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const keepFile = sortedFiles[0];
        const removeFiles = sortedFiles.slice(1);

        duplicateAnalysis.push({
          file_name: fileName,
          total_copies: files.length,
          keep_file: {
            id: keepFile.id,
            scenario_id: keepFile.scenario_id,
            status: keepFile.processing_status,
            has_data: !!keepFile.processed_data,
            created_at: keepFile.created_at
          },
          remove_files: removeFiles.map(f => ({
            id: f.id,
            scenario_id: f.scenario_id,
            status: f.processing_status,
            has_data: !!f.processed_data,
            created_at: f.created_at
          }))
        });

        // Add to removal list
        filesToRemove.push(...removeFiles.map(f => f.id));
      }
    }

    let removalResults = [];
    
    if (!preview && filesToRemove.length > 0) {
      // Actually remove the duplicates
      console.log(`Removing ${filesToRemove.length} duplicate files: ${filesToRemove.join(', ')}`);
      
      try {
        // Remove files in batches to avoid query limits
        const batchSize = 10;
        for (let i = 0; i < filesToRemove.length; i += batchSize) {
          const batch = filesToRemove.slice(i, i + batchSize);
          await sql`
            DELETE FROM data_files 
            WHERE id = ANY(${batch})
          `;
          
          removalResults.push({
            batch: Math.floor(i / batchSize) + 1,
            removed_ids: batch,
            success: true
          });
        }
      } catch (deleteError) {
        console.error('Error removing duplicates:', deleteError);
        return NextResponse.json({
          success: false,
          error: deleteError instanceof Error ? deleteError.message : 'Failed to remove duplicates'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      preview_mode: !!preview,
      total_files: allFiles.length,
      unique_files: Object.keys(fileGroups).length,
      total_duplicates: totalDuplicates,
      files_to_remove: filesToRemove.length,
      duplicate_analysis: duplicateAnalysis,
      removal_results: removalResults,
      summary: {
        files_with_duplicates: duplicateAnalysis.length,
        space_saved: totalDuplicates,
        action_taken: preview ? 'Preview only - no files removed' : `Removed ${filesToRemove.length} duplicate files`
      }
    });

  } catch (error) {
    console.error('Error in deduplicate-files:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // GET endpoint for preview mode
  try {
    const request = new NextRequest(new URL('http://localhost:3000/api/deduplicate-files'));
    const mockBody = JSON.stringify({ preview: true });
    
    // Create a new request with the preview body
    const previewRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: mockBody
    });
    
    return await POST(previewRequest);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
