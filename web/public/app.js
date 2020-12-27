var files;
var local_storage_available = false;
let searchParams = new URLSearchParams(window.location.search)

// Detect local storage
if (typeof(Storage) !== "undefined") {
    local_storage_available = true;
}

$(document).ready(function() {
    // Theme toggle
    $('#theme-switch').on('change', toggle_theme);
    if (localStorage.getItem('theme') == 'dark') {
        $('#theme-switch').prop('checked', true).trigger('change');
    } // End of if "Do we want a dark theme"

    // Do we have a file to process
    if (searchParams.has('filename') == true) {
        process_file(searchParams.get('filename'));
    } // End of if "Checking file param"

    // Upload
    $('input[type=file]').on('change', prepare_upload);
    bsCustomFileInput.init();

    $('#upload').on('submit', function(event) {
        event.preventDefault();
        upload_file();
    });
});

function toggle_theme() {
    if ($('body').hasClass('bootstrap-dark') == true) {
        $('body').removeClass('bootstrap-dark').addClass('bootstrap');
        localStorage.setItem('theme', 'light');
    } else {
        $('body').removeClass('bootstrap').addClass('bootstrap-dark');
        localStorage.setItem('theme', 'dark');
    }
} // End of function "toggle_theme"

// Upload and process //

function prepare_upload(event) {
    files = event.target.files;
} // End of function "prepare_upload"

function upload_file() {
    var fd = new FormData();
    var files = $('#customFile')[0].files;
    fd.append('file', files[0]);

    $.ajax({
        url: '/api/upload',
        type: 'POST',
        data: fd,
        cache: false,
        dataType: 'json',
        processData: false, // Don't process the files
        contentType: false, // Set content type to false as jQuery will tell the server its a query string request
    }).done(function(data, textStatus, jqXHR) {
        if (data.status == 'OK') {
            process_file(data.filename);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: data.message,
            });
        } // End of if "Do we have a valid response"
    }).fail(function(jqXHR, textStatus, errorThrown) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: errorThrown,
        });
    });
} // End of function "upload_file"

function process_file(filename) {
    $.ajax({
        url: '/api/process',
        data: {
            'filename': filename
        },
        dataType: 'json',
    }).done(function(response_data, textStatus, jqXHR) {
        if (response_data.status == 'OK') {
            var data = response_data.data;

            // Cleanup
            $('#output').addClass('d-none');
            $('#tabs').html('');
            $('#tab-content').html('');

            // Loop blocks
            $.each(data, function(i) {
                var block = data[i];
                $('#tabs').append('<li class="nav-item" role="presentation"><a class="nav-link" id="block_' + block['block'] + '-tab" data-toggle="tab" href="#block_' + block['block'] + '" role="tab" aria-controls="block_' + block['block'] + '" aria-selected="false">' + block['name'] + '</a></li>');
                $('#tab-content').append('<div class="tab-pane fade" id="block_' + block['block'] + '" role="tabpanel" aria-labelledby="block_' + block['block'] + '-tab"><h2 class="my-3">' + block['name'] + '</h2><div class="table-responsive"><table class="table"><thead><tr><th scope="col">Code</th><th scope="col">Text</th></tr></thead><tbody></tbody></table></div></div>');

                $.each(block['values'], function(j) {
                    var option = block['values'][j];
                    $('#block_' + block['block'] + ' table tbody').append('<tr><td class="font-weight-bold" colspan="2">' + option['name'] + '</td></tr>');

                    $.each(option['values'], function(k) {
                        var opt = option['values'][k];
                        $('#block_' + block['block'] + ' table tbody').append('<tr class="' + ((opt['selected'] == true) ? 'table-success' : '') + '"><td class="ml-5">' + opt['code'] + '</td><td>' + opt['text'] + '</td></tr>');
                    });
                });
            });

            // Dump the raw output
            $('#tabs').append('<li class="nav-item" role="presentation"><a class="nav-link" id="raw_output-tab" data-toggle="tab" href="#raw_output" role="tab" aria-controls="raw_output" aria-selected="false">Raw Output</a></li>');
            $('#tab-content').append('<div class="tab-pane fade" id="raw_output" role="tabpanel" aria-labelledby="raw_output-tab"><h2>Raw Output</h2><div class="raw_output"><samp>' + JSON.stringify(data) + '</samp></div></div>');

            // Finally,
            $('#tabs .nav-item').first().children('a').trigger('click');
            $('#output').removeClass('d-none');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: response_data.message,
            });
        } // End of if "Do we have a valid response"
    }).fail(function(jqXHR, textStatus, errorThrown) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: errorThrown,
        });
    });
} // End of function "process_file"
