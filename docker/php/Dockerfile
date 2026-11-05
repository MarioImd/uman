FROM php:8.1-apache
COPY umam.ini /usr/local/etc/php/conf.d/umam.ini
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers ssl \
 && a2ensite default-ssl \
 && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
 && mkdir -p /etc/ssl/private \
 && openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -subj /CN=umam.test \
      -keyout /etc/ssl/private/ssl-cert-snakeoil.key -out /etc/ssl/certs/ssl-cert-snakeoil.pem
